import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { MfaService } from './mfa.service.js';
import { EmailVerificationService } from './email-verification.service.js';
import { PasswordRecoveryService } from './password-recovery.service.js';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { JwtStrategy } from './jwt.strategy.js';
import { SessionService } from './session.service.js';
import { getJwtSecret, JWT_ALGORITHM, getJwtAccessExpiration } from '../common/config/jwt.config.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [
    PrismaModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: getJwtSecret(),
      signOptions: {
        expiresIn: getJwtAccessExpiration() as any,
        algorithm: JWT_ALGORITHM,
      },
    }),
  ],
  controllers: [AuthController],
  providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }, MfaService, EmailVerificationService, PasswordRecoveryService, AuthService, JwtStrategy, SessionService],
  exports: [AuthService, SessionService, JwtModule, PassportModule],
})
export class AuthModule {}
