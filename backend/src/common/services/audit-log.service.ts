import { PrismaService } from '../../prisma/prisma.service.js';
import { Injectable, Logger, Optional } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import fs from 'fs';
import path from 'path';

export interface AuditEventParams {
  clinicId?: string | null;
  module: 'Security' | 'Billing' | 'Clinical' | 'Inventory' | 'Settings' | 'Auth' | 'Staff';
  action: string;
  actorId?: string;
  actorName?: string;
  actorRole?: string;
  description: string;
  severity?: 'info' | 'warn' | 'success' | 'error';
  outcome?: 'SUCCESS' | 'FAILURE' | 'BLOCKED';
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

export interface StoredAuditEvent {
  id: string;
  timestamp: string;
  clinicId?: string | null;
  module: string;
  action: string;
  actorId?: string;
  actorName: string;
  actorRole: string;
  description: string;
  severity: string;
  outcome: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);
  private pendingWrites = new Set<Promise<unknown>>();
  async onModuleDestroy() { clearInterval(this.deliveryTimer); await Promise.allSettled([...this.pendingWrites]); }
  private storageDir = path.resolve(process.cwd(), 'storage');

  constructor(@Optional() private readonly prisma?: PrismaService) {}

  /**
   * Deep recursive sanitization to strip credentials, secrets, tokens,
   * credit cards, and sensitive identifiers.
   */
  sanitizeMetadata(data?: Record<string, any>): Record<string, any> | undefined {
    if (!data || typeof data !== 'object') return undefined;
    const sanitized: Record<string, any> = {};

    const sensitiveKeyPatterns = [
      'password',
      'token',
      'refreshtoken',
      'secret',
      'authorization',
      'creditcard',
      'cvv',
      'ssn',
      'aadhaar',
      'nationalid',
      'pan',
      'apikey',
    ];

    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      if (typeof value === 'string' && value.startsWith('eyJ') && value.length > 30) {
        // Redact bare JWT strings in values
        sanitized[key] = '[REDACTED_JWT]';
      } else if (sensitiveKeyPatterns.some((pattern) => lowerKey.includes(pattern))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeMetadata(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  /**
   * Records a structured audit event across durable destinations:
   * 1. Structured JSON output to stdout for SIEM log collectors (CloudWatch, Datadog, Vector).
   * 2. External HTTP Webhook forwarder (if AUDIT_LOG_WEBHOOK_URL is configured).
   * 3. Append-only immutable JSONL archive per clinic (preventing 200-event loss).
   * 4. UI view cache containing recent records for frontend activity displays.
   */
  recordEvent(params: AuditEventParams, persist = true): StoredAuditEvent {
    const timestamp = new Date().toISOString();
    const eventId = randomUUID();
    const outcome = params.outcome || (params.severity === 'error' || /FAILED|DENIED|REJECTED/.test(params.action) ? 'FAILURE' : 'SUCCESS');

    const cleanMetadata = this.sanitizeMetadata(params.metadata);

    const logEntry: StoredAuditEvent = {
      id: eventId,
      timestamp,
      clinicId: params.clinicId || null,
      module: params.module,
      action: params.action,
      actorId: params.actorId || undefined,
      actorName: params.actorName || 'System',
      actorRole: params.actorRole || 'SYSTEM',
      description: params.description,
      severity: params.severity || 'info',
      outcome,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent ? params.userAgent.slice(0, 100) : undefined,
      metadata: cleanMetadata,
    };

    if (this.prisma && persist) {
      const write = this.prisma.auditEvent.create({ data: {
        id: logEntry.id, clinicId: logEntry.clinicId, module: logEntry.module,
        action: logEntry.action, actorId: logEntry.actorId, actorName: logEntry.actorName,
        actorRole: logEntry.actorRole, description: logEntry.description, severity: logEntry.severity,
        outcome: logEntry.outcome, metadata: cleanMetadata as any, ipAddress: logEntry.ipAddress, userAgent: logEntry.userAgent,
      } }).catch(() => this.logger.error('Database audit write failed; retained in append-only archive and SIEM output.'));
      this.pendingWrites.add(write);
      void write.finally(() => this.pendingWrites.delete(write));
    }

    // 1. Structured SIEM JSON stream to stdout
    this.logger.log(
      `AUDIT: [${params.module}] [${params.action}] (${outcome}) - ${params.description} | Actor: ${logEntry.actorName} (${logEntry.actorRole}) | Clinic: ${params.clinicId || 'global'}`,
    );

    // 2. Dispatch to Centralized Webhook / SIEM Pipeline if configured
    const webhookUrl = process.env.AUDIT_LOG_WEBHOOK_URL;
    if (webhookUrl) {
      // Persisted events are delivered by the retry worker, including after restarts.
      if (!this.prisma) void this.forwardToCentralizedSink(webhookUrl, logEntry);
    }

    // 3. Durable Append-Only Storage (Zero historical data loss)
    if (params.clinicId) {
      try {
        const dir = path.join(this.storageDir, 'security-audits');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        // A. Permanent append-only .jsonl audit stream
        const jsonlFile = path.join(dir, `${params.clinicId}.audit.jsonl`);
        fs.appendFileSync(jsonlFile, JSON.stringify(logEntry) + '\n', 'utf-8');

        // B. Recent UI cache (capped at 200 items for fast web dashboards)
        const uiCacheFile = path.join(dir, `${params.clinicId}.json`);
        let recentLogs: StoredAuditEvent[] = [];
        if (fs.existsSync(uiCacheFile)) {
          try {
            recentLogs = JSON.parse(fs.readFileSync(uiCacheFile, 'utf-8'));
          } catch {
            recentLogs = [];
          }
        }
        recentLogs.unshift(logEntry);
        fs.writeFileSync(uiCacheFile, JSON.stringify(recentLogs.slice(0, 200), null, 2), 'utf-8');
      } catch (err: any) {
        this.logger.error(`Failed to persist durable audit log for clinic ${params.clinicId}: ${err.message}`);
      }
    }

    return logEntry;
  }

  /**
   * Retrieves audit logs for a given clinic.
   * Reads from the recent UI cache or falls back to reading the durable JSONL log.
   */
  getEvents(clinicId: string, limit = 200): StoredAuditEvent[] {
    try {
      const uiCacheFile = path.join(this.storageDir, 'security-audits', `${clinicId}.json`);
      if (fs.existsSync(uiCacheFile)) {
        const events = JSON.parse(fs.readFileSync(uiCacheFile, 'utf-8'));
        return Array.isArray(events) ? events.slice(0, limit) : [];
      }

      // Fallback: parse from durable JSONL
      const jsonlFile = path.join(this.storageDir, 'security-audits', `${clinicId}.audit.jsonl`);
      if (fs.existsSync(jsonlFile)) {
        const lines = fs.readFileSync(jsonlFile, 'utf-8').trim().split('\n').filter(Boolean);
        return lines
          .slice(-limit)
          .map((line) => JSON.parse(line))
          .reverse();
      }
    } catch (err: any) {
      this.logger.error(`Failed to read audit logs for clinic ${clinicId}: ${err.message}`);
    }
    return [];
  }

  /**
   * Reads the entire durable audit history from the immutable JSONL stream.
   */
  getDurableHistory(clinicId: string): StoredAuditEvent[] {
    try {
      const jsonlFile = path.join(this.storageDir, 'security-audits', `${clinicId}.audit.jsonl`);
      if (fs.existsSync(jsonlFile)) {
        const lines = fs.readFileSync(jsonlFile, 'utf-8').trim().split('\n').filter(Boolean);
        return lines.map((line) => JSON.parse(line));
      }
    } catch (err: any) {
      this.logger.error(`Failed to read durable history for clinic ${clinicId}: ${err.message}`);
    }
    return [];
  }

  private deliveryTimer?: ReturnType<typeof setInterval>;
  private delivering = false;
  onModuleInit() {
    if (process.env.AUDIT_LOG_WEBHOOK_URL && this.prisma) {
      this.deliveryTimer = setInterval(() => { void this.deliverPending(); }, 15000);
      this.deliveryTimer.unref();
      void this.deliverPending();
    }
  }
  async recordRequest(params: AuditEventParams) {
    const event = this.recordEvent(params, false);
    if (!this.prisma) throw new Error('Durable audit storage is required.');
    await this.prisma.auditEvent.create({ data: {
      id: event.id, clinicId: event.clinicId, module: event.module, action: event.action,
      actorId: event.actorId, actorName: event.actorName, actorRole: event.actorRole,
      description: event.description, severity: event.severity, outcome: event.outcome,
      ipAddress: event.ipAddress, userAgent: event.userAgent, metadata: event.metadata as any,
    } });
  }
  async deliverPending() {
    if (this.delivering || !this.prisma || !process.env.AUDIT_LOG_WEBHOOK_URL) return;
    this.delivering = true;
    try {
      const now = new Date();
      const entries = await this.prisma.auditEvent.findMany({ where: { forwardedAt: null, nextForwardAt: { lte: now } }, orderBy: { createdAt: 'asc' }, take: 50 });
      for (const entry of entries) {
        const claimed = await this.prisma.auditEvent.updateMany({ where: { id: entry.id, forwardedAt: null, nextForwardAt: { lte: now } },
          data: { nextForwardAt: new Date(Date.now() + Math.min(3600000, 30000 * 2 ** Math.min(entry.forwardAttempts, 7))), forwardAttempts: { increment: 1 } } });
        if (claimed.count !== 1) continue;
        try {
          const response = await fetch(process.env.AUDIT_LOG_WEBHOOK_URL, { method: 'POST', signal: AbortSignal.timeout(10000),
            headers: { 'Content-Type': 'application/json', 'Idempotency-Key': entry.id,
              ...(process.env.AUDIT_LOG_API_KEY ? { Authorization: `Bearer ${process.env.AUDIT_LOG_API_KEY}` } : {}) }, body: JSON.stringify(entry) });
          if (!response.ok) throw new Error('Audit collector rejected event.');
          await this.prisma.auditEvent.update({ where: { id: entry.id }, data: { forwardedAt: new Date() } });
        } catch { this.logger.error('Security audit delivery failed; event retained for retry.'); }
      }
    } catch { this.logger.error('Security audit outbox unavailable.'); }
    finally { this.delivering = false; }
  }

  private async forwardToCentralizedSink(webhookUrl: string, entry: StoredAuditEvent): Promise<void> {
    try {
      if (typeof fetch === 'function') {
        const response = await fetch(webhookUrl, {
          signal: AbortSignal.timeout(10000),
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(process.env.AUDIT_LOG_API_KEY ? { 'Authorization': `Bearer ${process.env.AUDIT_LOG_API_KEY}` } : {}),
          },
          body: JSON.stringify(entry),
        });
        if (!response.ok) throw new Error('Audit collector rejected event.');
      }
    } catch (err: any) {
      this.logger.warn(`Failed to dispatch audit log to external webhook: ${err.message}`);
    }
  }
}
