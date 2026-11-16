import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service.js';
import { SessionService } from './session.service.js';
import { getJwtSecret, JWT_ALGORITHM } from '../common/config/jwt.config.js';

export interface JwtPayload {
  sub: string;
  sessionId?: string;
  email: string;
  role: string;
  clinicId: string | null;
  isPlatformAdmin: boolean;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(PrismaService) private prisma: PrismaService,
    @Inject(SessionService) private sessionService: SessionService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getJwtSecret(),
      algorithms: [JWT_ALGORITHM],
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        clinicId: true,
        isPlatformAdmin: true,
        isPrimaryContact: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User account is inactive or no longer exists.');
    }

    // If access token carries a sessionId, verify that the session has not been revoked or expired
    if (payload.sessionId) {
      const isValid = await this.sessionService.isSessionValid(payload.sessionId, user.id);
      if (!isValid) {
        throw new UnauthorizedException('Session has been revoked or expired. Please log in again.');
      }
    }

    return {
      ...user,
      sessionId: payload.sessionId,
    };
  }
}
