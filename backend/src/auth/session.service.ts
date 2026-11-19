import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import crypto, { randomUUID } from 'crypto';
import type { UserSession } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { getJwtRefreshTtlSeconds } from '../common/config/jwt.config.js';

export type { UserSession };

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Hashes a raw refresh token using SHA-256.
   * Plaintext tokens are never stored in the database, file logs, or memory.
   */
  public static hashToken(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
  }

  /**
   * Generates a cryptographically secure 256-bit random hex string.
   */
  public static generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Creates a new persistent session record in PostgreSQL for an authenticated user.
   * Stores the SHA-256 token hash and returns the raw plaintext refresh token to be set in an HttpOnly cookie.
   */
  async createSession(
    userId: string,
    clinicId: string | null,
    meta?: { userAgent?: string; ipAddress?: string },
  ): Promise<{ session: UserSession; refreshToken: string }> {
    const rawRefreshToken = SessionService.generateSecureToken();
    const tokenHash = SessionService.hashToken(rawRefreshToken);
    const familyId = randomUUID();
    const now = new Date();
    const ttlSeconds = getJwtRefreshTtlSeconds();
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);

    const session = await this.prisma.userSession.create({
      data: {
        userId,
        clinicId,
        tokenHash,
        familyId,
        previousTokenHashes: [],
        isRevoked: false,
        createdAt: now,
        updatedAt: now,
        lastActiveAt: now,
        expiresAt,
        userAgent: meta?.userAgent,
        ipAddress: meta?.ipAddress,
      },
    });

    return { session, refreshToken: rawRefreshToken };
  }

  /**
   * Atomically rotates a refresh token in PostgreSQL.
   * - Validates the active token hash.
   * - Archives the old hash into previousTokenHashes for reuse detection.
   * - Generates and hashes a new refresh token.
   * - If an already-rotated token hash is presented, immediately detects REUSE
   *   and terminates all sessions in the token family.
   */
  async rotateRefreshToken(
    rawRefreshToken: string,
    meta?: { userAgent?: string; ipAddress?: string },
  ): Promise<{ session: UserSession; newRefreshToken: string }> {
    if (!rawRefreshToken || typeof rawRefreshToken !== 'string') {
      throw new UnauthorizedException('Invalid or missing refresh token.');
    }

    const incomingHash = SessionService.hashToken(rawRefreshToken.trim());
    const now = new Date();
    const ttlSeconds = getJwtRefreshTtlSeconds();
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);
    const newRawRefreshToken = SessionService.generateSecureToken();
    const newTokenHash = SessionService.hashToken(newRawRefreshToken);

    const txResult = await this.prisma.$transaction(async (tx) => {
      // 1. Check if token is the current active token
      const session = await tx.userSession.findUnique({
        where: { tokenHash: incomingHash },
      });

      if (session) {
        if (session.isRevoked) {
          throw new UnauthorizedException(
            session.revocationReason
              ? `Session revoked: ${session.revocationReason}`
              : 'Session has been revoked.',
          );
        }

        if (session.expiresAt.getTime() <= now.getTime()) {
          throw new UnauthorizedException('Refresh token has expired. Please log in again.');
        }

        // Atomically rotate: archive current tokenHash and set newTokenHash
        const updated = await tx.userSession.update({
          where: { id: session.id },
          data: {
            tokenHash: newTokenHash,
            previousTokenHashes: { push: session.tokenHash },
            lastActiveAt: now,
            expiresAt,
            userAgent: meta?.userAgent || session.userAgent,
            ipAddress: meta?.ipAddress || session.ipAddress,
          },
        });

        return { session: updated, newRefreshToken: newRawRefreshToken };
      }

      // 2. Token Reuse Detection: Search if incoming token was previously rotated
      const compromisedSession = await tx.userSession.findFirst({
        where: { previousTokenHashes: { has: incomingHash } },
      });

      if (compromisedSession) {
        this.logger.warn(
          `SECURITY ALERT: Refresh token reuse detected for family ${compromisedSession.familyId}! Terminating family.`,
        );

        // Terminate all sessions belonging to the compromised family and commit the revocation
        await tx.userSession.updateMany({
          where: { familyId: compromisedSession.familyId, isRevoked: false },
          data: {
            isRevoked: true,
            revocationReason: 'Security revocation: Refresh token reuse detected',
          },
        });

        return { reuseDetected: true, familyId: compromisedSession.familyId };
      }

      // 3. Unrecognized token
      throw new UnauthorizedException('Invalid or unknown refresh token.');
    });

    if ('reuseDetected' in txResult && txResult.reuseDetected) {
      throw new UnauthorizedException(
        'Security violation: Refresh token reuse detected. All sessions in this family have been terminated.',
      );
    }

    return txResult as { session: UserSession; newRefreshToken: string };
  }

  /**
   * Validates whether a given session ID is active, unrevoked, unexpired, and belongs to the user.
   * Queried by JwtStrategy on incoming authenticated requests.
   */
  async isSessionValid(sessionId: string, userId: string): Promise<boolean> {
    if (!sessionId || !userId) return false;

    const session = await this.prisma.userSession.findUnique({
      where: { id: sessionId },
      select: { id: true, userId: true, isRevoked: true, expiresAt: true },
    });

    if (!session) return false;
    if (session.userId !== userId) return false;
    if (session.isRevoked) return false;
    if (session.expiresAt.getTime() <= Date.now()) return false;

    return true;
  }

  /**
   * Revokes a specific session by its session ID in PostgreSQL.
   */
  async revokeSession(sessionId: string, reason = 'Explicit logout'): Promise<boolean> {
    try {
      await this.prisma.userSession.update({
        where: { id: sessionId },
        data: {
          isRevoked: true,
          revocationReason: reason,
        },
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Revokes a session identified by its active or previous refresh token.
   */
  async revokeSessionByRefreshToken(rawRefreshToken: string, reason = 'Explicit logout'): Promise<boolean> {
    if (!rawRefreshToken) return false;
    const hash = SessionService.hashToken(rawRefreshToken.trim());

    const session = await this.prisma.userSession.findUnique({
      where: { tokenHash: hash },
    });

    if (session) {
      await this.prisma.userSession.update({
        where: { id: session.id },
        data: {
          isRevoked: true,
          revocationReason: reason,
        },
      });
      return true;
    }

    const previousSession = await this.prisma.userSession.findFirst({
      where: { previousTokenHashes: { has: hash } },
    });

    if (previousSession) {
      await this.prisma.userSession.updateMany({
        where: { familyId: previousSession.familyId },
        data: {
          isRevoked: true,
          revocationReason: reason,
        },
      });
      return true;
    }

    return false;
  }

  /**
   * Revokes all active sessions for a user (e.g., on password change or account deactivation).
   * Optionally exempts the current active session if specified.
   */
  async revokeAllUserSessions(
    userId: string,
    exceptSessionId?: string,
    reason = 'Password changed or account deactivated',
  ): Promise<number> {
    const whereClause: any = {
      userId,
      isRevoked: false,
    };
    if (exceptSessionId) {
      whereClause.id = { not: exceptSessionId };
    }

    const result = await this.prisma.userSession.updateMany({
      where: whereClause,
      data: {
        isRevoked: true,
        revocationReason: reason,
      },
    });

    if (result.count > 0) {
      this.logger.log(`Revoked ${result.count} session(s) for user ${userId}. Reason: ${reason}`);
    }

    return result.count;
  }

  /**
   * Returns a session record by session ID from PostgreSQL.
   */
  async getSession(sessionId: string): Promise<UserSession | null> {
    return this.prisma.userSession.findUnique({
      where: { id: sessionId },
    });
  }
}
