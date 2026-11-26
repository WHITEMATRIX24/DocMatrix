import { BadRequestException, Injectable, UnauthorizedException, ServiceUnavailableException } from '@nestjs/common';
import { createCipheriv, createDecipheriv, createHmac, randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service.js';

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export function base32(bytes: Buffer): string {
  let bits = 0, value = 0, result = '';
  for (const byte of bytes) { value = (value << 8) | byte; bits += 8; while (bits >= 5) { bits -= 5; result += alphabet[(value >>> bits) & 31]; } }
  if (bits) result += alphabet[(value << (5 - bits)) & 31];
  return result;
}
export function totp(secret: Buffer, step: number, digits = 6): string {
  const counter = Buffer.alloc(8); counter.writeBigUInt64BE(BigInt(step));
  const hmac = createHmac('sha1', secret).update(counter).digest();
  return String((hmac.readUInt32BE(hmac[hmac.length - 1] & 15) & 0x7fffffff) % 10 ** digits).padStart(digits, '0');
}
export function authScope(user: { emailVerifiedAt?: Date | null; mfaEnabled?: boolean; isPlatformAdmin?: boolean; role?: string }): 'full' | 'account-setup' {
  const enforce = process.env.NODE_ENV === 'production' || process.env.ENFORCE_ACCOUNT_SECURITY === 'true';
  const privileged = user.isPlatformAdmin || ['ORGANIZATION_ADMIN', 'BRANCH_ADMIN'].includes(user.role || '');
  return enforce && (!user.emailVerifiedAt || (privileged && !user.mfaEnabled)) ? 'account-setup' : 'full';
}
@Injectable()
export class MfaService {
  constructor(private readonly db: PrismaService) {}
  private key() {
    const raw = process.env.AUTH_ENCRYPTION_KEY || '';
    if (!/^[a-f0-9]{64}$/i.test(raw)) throw new ServiceUnavailableException('Account security encryption is not configured.');
    return Buffer.from(raw, 'hex');
  }
  encrypt(secret: Buffer) {
    const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', this.key(), iv);
    return Buffer.concat([iv, cipher.update(secret), cipher.final(), cipher.getAuthTag()]).toString('base64');
  }
  private decrypt(encoded: string) {
    const data = Buffer.from(encoded, 'base64'), cipher = createDecipheriv('aes-256-gcm', this.key(), data.subarray(0, 12));
    cipher.setAuthTag(data.subarray(-16)); return Buffer.concat([cipher.update(data.subarray(12, -16)), cipher.final()]);
  }
  private validStep(encoded: string, code: string, previous: bigint): bigint {
    if (!/^\d{6}$/.test(code)) throw new UnauthorizedException('Invalid verification code.');
    const secret = this.decrypt(encoded), now = Math.floor(Date.now() / 30000);
    for (const step of [now, now - 1, now + 1]) if (BigInt(step) > previous && timingSafeEqual(Buffer.from(totp(secret, step)), Buffer.from(code))) return BigInt(step);
    throw new UnauthorizedException('Invalid or already used verification code.');
  }
  async begin(userId: string, password: string) {
    const user = await this.db.user.findUnique({ where: { id: userId } });
    if (!user || !await bcrypt.compare(password, user.passwordHash)) throw new UnauthorizedException('Current password is incorrect.');
    if (user.mfaEnabled) throw new BadRequestException('Two-step verification is already enabled.');
    const secret = randomBytes(20);
    await this.db.user.update({ where: { id: userId }, data: { mfaPendingSecret: this.encrypt(secret) } });
    const key = base32(secret);
    return { secret: key, uri: `otpauth://totp/${encodeURIComponent('DocMatrix:' + user.email)}?secret=${key}&issuer=DocMatrix&algorithm=SHA1&digits=6&period=30` };
  }
  async confirm(userId: string, code: string) {
    const user = await this.db.user.findUnique({ where: { id: userId } });
    if (!user?.mfaPendingSecret || user.mfaEnabled) throw new BadRequestException('Start two-step verification setup first.');
    const step = this.validStep(user.mfaPendingSecret, code, -1n);
    const recoveryCodes = Array.from({ length: 10 }, () => randomBytes(10).toString('hex'));
    const result = await this.db.user.updateMany({ where: { id: userId, mfaEnabled: false, mfaPendingSecret: user.mfaPendingSecret },
      data: { mfaEnabled: true, mfaSecret: user.mfaPendingSecret, mfaPendingSecret: null, mfaLastStep: step,
        mfaRecoveryHashes: recoveryCodes.map(value => createHash('sha256').update(value).digest('hex')) } });
    if (result.count !== 1) throw new BadRequestException('Setup changed. Start again.');
    await this.db.userSession.updateMany({ where: { userId, isRevoked: false }, data: { isRevoked: true, revocationReason: 'Two-step verification enabled; sign in again' } });
    return { recoveryCodes, message: 'Save these recovery codes securely. Sign in again with your authenticator.' };
  }
  async verify(userId: string, code: string) {
    const user = await this.db.user.findUnique({ where: { id: userId } });
    if (!user?.mfaEnabled || !user.mfaSecret) throw new UnauthorizedException('Enable two-step verification first.');
    const recoveryHash = createHash('sha256').update(code).digest('hex');
    const isRecovery = /^[a-f0-9]{20}$/.test(code) && user.mfaRecoveryHashes.includes(recoveryHash);
    const step = isRecovery ? user.mfaLastStep : this.validStep(user.mfaSecret, code, user.mfaLastStep);
    const result = await this.db.user.updateMany({ where: { id: userId, mfaEnabled: true, mfaLastStep: user.mfaLastStep,
      ...(isRecovery ? { mfaRecoveryHashes: { has: recoveryHash } } : {}) },
      data: isRecovery ? { mfaRecoveryHashes: user.mfaRecoveryHashes.filter(hash => hash !== recoveryHash) } : { mfaLastStep: step } });
    if (result.count !== 1) throw new UnauthorizedException('Code already used. Try a new code.');
  }
  async stepUp(userId: string, sessionId: string, code: string) {
    await this.verify(userId, code);
    const result = await this.db.userSession.updateMany({ where: { id: sessionId, userId, isRevoked: false, expiresAt: { gt: new Date() } }, data: { mfaVerifiedAt: new Date() } });
    if (result.count !== 1) throw new UnauthorizedException('Session expired.');
    return { success: true, validForSeconds: 300 };
  }
}
