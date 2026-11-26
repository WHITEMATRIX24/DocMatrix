import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
@Injectable()
export class EmailVerificationService {
  constructor(private readonly db: PrismaService) {}
  async request(userId: string) {
    const endpoint = process.env.ACCOUNT_EMAIL_DELIVERY_URL || process.env.PASSWORD_RESET_DELIVERY_URL;
    const key = process.env.ACCOUNT_EMAIL_DELIVERY_KEY || process.env.PASSWORD_RESET_DELIVERY_KEY;
    const appUrl = process.env.PUBLIC_APP_URL;
    if (!endpoint || !key || !appUrl) throw new ServiceUnavailableException('Account email delivery is not configured. Contact your administrator.');
    const url = new URL(endpoint), origin = new URL(appUrl);
    if (process.env.NODE_ENV === 'production' && (url.protocol !== 'https:' || origin.protocol !== 'https:')) throw new ServiceUnavailableException('Secure account delivery is required.');
    const user = await this.db.user.findUnique({ where: { id: userId } });
    if (!user?.isActive || user.emailVerifiedAt) return { success: true };
    const recent = await this.db.emailVerification.count({ where: { userId, createdAt: { gt: new Date(Date.now() - 3600000) } } });
    if (recent >= 3) return { success: true, message: 'Check your inbox or try again later.' };
    const token = randomBytes(32).toString('hex'), tokenHash = createHash('sha256').update(token).digest('hex');
    await this.db.emailVerification.create({ data: { userId, tokenHash, expiresAt: new Date(Date.now() + 30 * 60000) } });
    const link = new URL('/verify-email', origin); link.hash = new URLSearchParams({ token }).toString();
    try {
      const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}`, 'Idempotency-Key': tokenHash },
        body: JSON.stringify({ to: user.email, template: 'verify-email', verificationUrl: link.href, expiresInMinutes: 30 }), signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error('Delivery failed');
    } catch { throw new ServiceUnavailableException('Account email delivery is unavailable. Try again later.'); }
    return { success: true, message: 'Check your email for a verification link.' };
  }
  async complete(token: string) {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    return this.db.$transaction(async tx => {
      const row = await tx.emailVerification.findUnique({ where: { tokenHash } }), now = new Date();
      if (!row || row.consumedAt || row.expiresAt <= now) throw new BadRequestException('Verification link is invalid or expired.');
      const claimed = await tx.emailVerification.updateMany({ where: { id: row.id, consumedAt: null, expiresAt: { gt: now } }, data: { consumedAt: now } });
      if (claimed.count !== 1) throw new BadRequestException('Verification link was already used.');
      await tx.user.update({ where: { id: row.userId, isActive: true }, data: { emailVerifiedAt: now } });
      await tx.emailVerification.updateMany({ where: { userId: row.userId, consumedAt: null }, data: { consumedAt: now } });
      return { success: true, message: 'Email verified. Sign in to continue.' };
    });
  }
}
