import { assertNewPassword } from './password.policy.js';
import { Injectable, Inject, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service.js';
@Injectable()
export class PasswordRecoveryService {
  constructor(@Inject(PrismaService) private readonly db: PrismaService) {}
  async request(email: string) {
    const endpoint = process.env.PASSWORD_RESET_DELIVERY_URL;
    const key = process.env.PASSWORD_RESET_DELIVERY_KEY;
    const appUrl = process.env.PUBLIC_APP_URL;
    if (!endpoint || !key || !appUrl) throw new ServiceUnavailableException('Password recovery is not configured. Contact your clinic administrator.');
    let delivery: URL, origin: URL;
    try { delivery = new URL(endpoint); origin = new URL(appUrl); } catch { throw new ServiceUnavailableException('Password recovery configuration is invalid.'); }
    if (process.env.NODE_ENV === 'production' && (delivery.protocol !== 'https:' || origin.protocol !== 'https:')) throw new ServiceUnavailableException('Secure password recovery delivery is required.');
    const message = 'If this address has an active account, a password recovery link will be sent.';
    const user = await this.db.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (!user?.isActive) return { success: true, message };
    const token = randomBytes(32).toString('hex');
    const row = await this.db.passwordReset.create({ data: { userId: user.id, tokenHash: createHash('sha256').update(token).digest('hex'), expiresAt: new Date(Date.now() + 30 * 60000) } });
    const link = new URL('/reset-password', origin); link.hash = new URLSearchParams({ token }).toString();
    try {
      const response = await fetch(delivery, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({ to: user.email, template: 'password-reset', resetUrl: link.href, expiresInMinutes: 30 }), signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error('Delivery rejected');
    } catch {
      await this.db.passwordReset.update({ where: { id: row.id }, data: { consumedAt: new Date() } });
      // Keep the public response identical for unknown accounts and delivery failures.
      console.error('Password recovery delivery failed; token invalidated.');
    }
    return { success: true, message };
  }
  async complete(token: string, password: string) {
    assertNewPassword(password);
    if (!/^[a-f0-9]{64}$/.test(token)) throw new BadRequestException('Invalid password recovery request.');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const candidate = await this.db.passwordReset.findUnique({ where: { tokenHash } });
    if (!candidate || candidate.consumedAt || candidate.expiresAt <= new Date()) throw new BadRequestException('This recovery link is invalid or expired.');
    const hash = await bcrypt.hash(password, 12);
    return this.db.$transaction(async tx => {
      const reset = await tx.passwordReset.findUnique({ where: { tokenHash } });
      const now = new Date();
      if (!reset || reset.consumedAt || reset.expiresAt <= now) throw new BadRequestException('This recovery link is invalid or expired.');
      const user = await tx.user.findUnique({ where: { id: reset.userId } });
      if (!user?.isActive) throw new BadRequestException('This recovery link is invalid or expired.');
      const claimed = await tx.passwordReset.updateMany({ where: { id: reset.id, consumedAt: null, expiresAt: { gt: now } }, data: { consumedAt: now } });
      if (claimed.count !== 1) throw new BadRequestException('This recovery link has already been used.');
      await tx.user.update({ where: { id: user.id }, data: { passwordHash: hash } });
      await tx.passwordReset.updateMany({ where: { userId: user.id, consumedAt: null }, data: { consumedAt: now } });
      await tx.userSession.updateMany({ where: { userId: user.id, isRevoked: false }, data: { isRevoked: true, revocationReason: 'Password recovered' } });
      return { success: true, message: 'Password updated. Sign in with your new password.' };
    });
  }
}
