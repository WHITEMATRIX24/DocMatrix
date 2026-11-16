import { Injectable, UnauthorizedException, ForbiddenException, ConflictException, BadRequestException, Inject, Optional } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { StaffRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { SessionService } from './session.service.js';
import { RateLimiterService } from '../common/services/rate-limiter.service.js';
import { AuditLogService } from '../common/services/audit-log.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterClinicDto } from './dto/register-clinic.dto.js';

@Injectable()
export class AuthService {
  private storageDir = path.resolve(process.cwd(), 'storage');

  constructor(
    @Inject(PrismaService) private prisma: PrismaService,
    @Inject(JwtService) private jwtService: JwtService,
    @Inject(SessionService) private sessionService: SessionService,
    @Optional() @Inject(RateLimiterService) private rateLimiter?: RateLimiterService,
    @Optional() @Inject(AuditLogService) private auditLog?: AuditLogService,
  ) {}

  private logSecurityEvent(
    clinicId: string | null | undefined,
    action: string,
    actorName: string,
    actorRole: string,
    description: string,
    severity: 'info' | 'warn' | 'success' = 'info',
  ) {
    if (this.auditLog) {
      this.auditLog.recordEvent({
        clinicId,
        module: 'Security',
        action,
        actorName,
        actorRole,
        description,
        severity,
      });
      return;
    }

    if (!clinicId) return;
    try {
      const dir = path.join(this.storageDir, 'security-audits');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const file = path.join(dir, `${clinicId}.json`);
      let logs = [];
      if (fs.existsSync(file)) {
        logs = JSON.parse(fs.readFileSync(file, 'utf-8'));
      }
      logs.unshift({
        id: `sec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
        module: 'Security',
        action,
        actorName,
        actorRole,
        description,
        severity,
      });
      fs.writeFileSync(file, JSON.stringify(logs.slice(0, 100), null, 2), 'utf-8');
    } catch {}
  }

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: {
        clinic: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
          },
        },
      },
    });

    if (!user || !user.isActive) {
      return null;
    }

    const isMatch = await bcrypt.compare(pass, user.passwordHash);
    if (!isMatch) {
      return null;
    }

    const { passwordHash, ...result } = user;
    return result;
  }

  async login(loginDto: LoginDto, meta?: { userAgent?: string; ipAddress?: string }, platformAdminOnly = false) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      if (this.rateLimiter) {
        await this.rateLimiter.recordFailedLogin(meta?.ipAddress || '127.0.0.1', loginDto.email);
      }

      const existingUser = await this.prisma.user.findUnique({
        where: { email: loginDto.email.toLowerCase().trim() },
        select: { clinicId: true, fullName: true, role: true },
      });
      if (existingUser?.clinicId) {
        this.logSecurityEvent(
          existingUser.clinicId,
          'LOGIN_FAILED',
          existingUser.fullName || loginDto.email,
          existingUser.role || 'USER',
          `Failed login attempt for ${loginDto.email}`,
          'warn',
        );
      }
      throw new UnauthorizedException('Invalid email or password.');
    }

    if (platformAdminOnly && user.isPlatformAdmin !== true) {
      this.logSecurityEvent(user.clinicId, 'PLATFORM_LOGIN_DENIED', user.fullName, user.role,
        'Platform login denied: account is not a platform administrator.', 'warn');
      throw new ForbiddenException('Platform administrator access is required.');
    }

    if (this.rateLimiter) {
      await this.rateLimiter.recordSuccessfulLogin(meta?.ipAddress || '127.0.0.1', loginDto.email);
    }

    // Create a new uniquely tracked session with refresh token
    const { session, refreshToken } = await this.sessionService.createSession(
      user.id,
      user.clinicId,
      meta,
    );

    const payload = {
      sub: user.id,
      sessionId: session.id,
      email: user.email,
      role: user.role,
      clinicId: user.clinicId,
      isPlatformAdmin: user.isPlatformAdmin,
    };

    const token = this.jwtService.sign(payload);

    if (user.clinicId) {
      this.logSecurityEvent(
        user.clinicId,
        'LOGIN_SUCCESS',
        user.fullName,
        user.role,
        `User ${user.fullName} successfully authenticated. Session created: ${session.id.slice(0, 8)}...`,
        'info',
      );
    }

    return {
      token,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.fullName,
        fullName: user.fullName,
        role: user.role,
        clinicId: user.clinicId,
        clinicName: user.clinic?.name,
        isPlatformAdmin: user.isPlatformAdmin,
        isPrimaryContact: user.isPrimaryContact,
      },
    };
  }

  async registerClinic(dto: RegisterClinicDto, meta?: { userAgent?: string; ipAddress?: string }) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (existing) {
      throw new ConflictException('A user with this email address already exists.');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    const baseSlug = dto.clinicName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'clinic';
    const slug = `${baseSlug}-${Date.now().toString(36)}`;

    const result = await this.prisma.$transaction(async (tx) => {
      const clinic = await tx.clinic.create({
        data: {
          name: dto.clinicName.trim(),
          slug,
          phone: dto.mobile.trim(),
          email: dto.email.toLowerCase().trim(),
          city: dto.city?.trim() || null,
          state: dto.state?.trim() || null,
          country: dto.country?.trim() || 'India',
          address: dto.address?.trim() || null,
          practiceType: dto.practiceType || 'Solo',
        },
      });

      const user = await tx.user.create({
        data: {
          clinicId: clinic.id,
          email: dto.email.toLowerCase().trim(),
          passwordHash,
          fullName: dto.fullName.trim(),
          phone: dto.mobile.trim(),
          role: StaffRole.ORGANIZATION_ADMIN,
          isPlatformAdmin: false,
          isPrimaryContact: true,
          isActive: true,
        },
      });

      return { clinic, user };
    });

    // Create session for initial registration
    const { session, refreshToken } = await this.sessionService.createSession(
      result.user.id,
      result.clinic.id,
      meta,
    );

    const payload = {
      sub: result.user.id,
      sessionId: session.id,
      email: result.user.email,
      role: result.user.role,
      clinicId: result.clinic.id,
      isPlatformAdmin: false,
    };

    const token = this.jwtService.sign(payload);

    this.logSecurityEvent(
      result.clinic.id,
      'CLINIC_REGISTERED',
      result.user.fullName,
      'ORGANIZATION_ADMIN',
      `New clinic "${result.clinic.name}" registered by ${result.user.fullName}`,
      'success',
    );

    return {
      token,
      refreshToken,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.fullName,
        fullName: result.user.fullName,
        role: result.user.role,
        clinicId: result.clinic.id,
        clinicName: result.clinic.name,
        isPlatformAdmin: false,
        isPrimaryContact: true,
      },
    };
  }

  async refreshSession(rawRefreshToken: string, meta?: { userAgent?: string; ipAddress?: string }) {
    if (!rawRefreshToken || typeof rawRefreshToken !== 'string') {
      throw new UnauthorizedException('Refresh token is required.');
    }

    // Rotate refresh token and update session tracking
    const { session, newRefreshToken } = await this.sessionService.rotateRefreshToken(
      rawRefreshToken,
      meta,
    );

    // Verify user is still active and exists in database
    const user = await this.prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        clinic: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
          },
        },
      },
    });

    if (!user || !user.isActive) {
      await this.sessionService.revokeSession(session.id, 'User account is inactive or disabled');
      throw new UnauthorizedException('User account is inactive or no longer exists.');
    }

    const payload = {
      sub: user.id,
      sessionId: session.id,
      email: user.email,
      role: user.role,
      clinicId: user.clinicId,
      isPlatformAdmin: user.isPlatformAdmin,
    };

    const token = this.jwtService.sign(payload);

    if (user.clinicId) {
      this.logSecurityEvent(
        user.clinicId,
        'TOKEN_REFRESHED',
        user.fullName,
        user.role,
        `Session ${session.id.slice(0, 8)}... rotated refresh token`,
        'info',
      );
    }

    return {
      token,
      refreshToken: newRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.fullName,
        fullName: user.fullName,
        role: user.role,
        clinicId: user.clinicId,
        clinicName: user.clinic?.name,
        isPlatformAdmin: user.isPlatformAdmin,
        isPrimaryContact: user.isPrimaryContact,
      },
    };
  }

  async logout(authHeader?: string, rawRefreshToken?: string) {
    let sessionRevoked = false;

    // 1. Revoke by bearer token sessionId if present
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.slice(7).trim();
        const decoded: any = this.jwtService.decode(token);
        if (decoded?.sessionId) {
          await this.sessionService.revokeSession(decoded.sessionId, 'User logged out');
          sessionRevoked = true;
        }
      } catch {}
    }

    // 2. Revoke by refresh token if present
    if (rawRefreshToken) {
      const revoked = await this.sessionService.revokeSessionByRefreshToken(rawRefreshToken, 'User logged out');
      if (revoked) sessionRevoked = true;
    }

    return {
      success: true,
      message: 'Logged out successfully.',
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        clinic: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
            phone: true,
            email: true,
            city: true,
            state: true,
            timezone: true,
            currency: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found.');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.fullName,
      fullName: user.fullName,
      role: user.role,
      clinicId: user.clinicId,
      clinic: user.clinic,
      isPlatformAdmin: user.isPlatformAdmin,
      isPrimaryContact: user.isPrimaryContact,
      isActive: user.isActive,
    };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string, clinicId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found.');
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new BadRequestException('Current password is incorrect.');
    }

    if (newPassword.length < 8) {
      throw new BadRequestException('New password must be at least 8 characters long.');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    // Invalidate all existing active sessions upon password change
    const revokedCount = await this.sessionService.revokeAllUserSessions(
      userId,
      undefined,
      'Password was changed',
    );

    const targetClinicId = clinicId || user.clinicId;
    if (targetClinicId) {
      this.logSecurityEvent(
        targetClinicId,
        'PASSWORD_CHANGED',
        user.fullName,
        user.role,
        `Password was updated for user ${user.fullName} (${user.email}). ${revokedCount} active session(s) terminated.`,
        'success',
      );
    }

    return {
      success: true,
      message: 'Password updated successfully. All active sessions have been invalidated.',
    };
  }

  async revokeSessions(userId: string, clinicId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found.');
    }

    const revokedCount = await this.sessionService.revokeAllUserSessions(
      userId,
      undefined,
      'User requested manual session revocation',
    );

    const targetClinicId = clinicId || user.clinicId;
    if (targetClinicId) {
      this.logSecurityEvent(
        targetClinicId,
        'SESSION_REVOKED',
        user.fullName,
        user.role,
        `All active sessions (${revokedCount}) invalidated by ${user.fullName}`,
        'warn',
      );
    }

    return {
      success: true,
      message: 'All active sessions and tokens have been invalidated.',
    };
  }
}
