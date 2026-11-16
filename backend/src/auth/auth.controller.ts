import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterClinicDto } from './dto/register-clinic.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { Public } from '../common/decorators/public.decorator.js';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import {
  extractCookie,
  REFRESH_COOKIE_NAME,
  setRefreshCookie,
  clearRefreshCookie,
} from '../common/config/jwt.config.js';
import { getAllowedOrigins } from '../common/config/cors.config.js';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * Validates CSRF defense headers on sensitive state-changing endpoints (/auth/refresh, /auth/logout).
   * Enforces presence of X-Requested-With header and validates Origin against CORS allowlist.
   */
  private validateCsrf(req: Request): void {
    const requestedWith = req.headers['x-requested-with'];
    const origin = req.headers['origin'] as string | undefined;

    if (!requestedWith || (requestedWith !== 'XMLHttpRequest' && requestedWith !== 'docmatrix-web')) {
      throw new ForbiddenException('CSRF check failed: Missing or invalid X-Requested-With header.');
    }

    if (origin) {
      const allowed = getAllowedOrigins();
      if (allowed.length > 0 && !allowed.includes(origin)) {
        throw new ForbiddenException(`CSRF check failed: Origin '${origin}' is not authorized.`);
      }
    }
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() loginDto: LoginDto,
  ) {
    const meta = {
      userAgent: req.headers['user-agent'],
      ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress,
    };
    const result = await this.authService.login(loginDto, meta);
    if (result.refreshToken) {
      setRefreshCookie(res, result.refreshToken);
    }
    const { refreshToken, ...responseBody } = result;
    return responseBody;
  }

  @Public()
  @Post('platform-login')
  @HttpCode(HttpStatus.OK)
  async platformLogin(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() loginDto: LoginDto,
  ) {
    const result = await this.authService.login(loginDto, {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip || req.socket.remoteAddress,
    }, true);
    if (result.refreshToken) setRefreshCookie(res, result.refreshToken);
    const { refreshToken, ...responseBody } = result;
    return responseBody;
  }

  @Public()
  @Post('register-clinic')
  @HttpCode(HttpStatus.CREATED)
  async registerClinic(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() dto: RegisterClinicDto,
  ) {
    const meta = {
      userAgent: req.headers['user-agent'],
      ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress,
    };
    const result = await this.authService.registerClinic(dto, meta);
    if (result.refreshToken) {
      setRefreshCookie(res, result.refreshToken);
    }
    const { refreshToken, ...responseBody } = result;
    return responseBody;
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() dto: RefreshTokenDto,
  ) {
    this.validateCsrf(req);

    const cookieToken = extractCookie(req.headers.cookie, REFRESH_COOKIE_NAME);
    const tokenToUse = cookieToken || dto?.refreshToken;

    if (!tokenToUse) {
      throw new UnauthorizedException('Refresh token is required.');
    }

    const meta = {
      userAgent: req.headers['user-agent'],
      ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress,
    };

    const result = await this.authService.refreshSession(tokenToUse, meta);
    if (result.refreshToken) {
      setRefreshCookie(res, result.refreshToken);
    }
    const { refreshToken, ...responseBody } = result;
    return responseBody;
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() dto?: RefreshTokenDto,
  ) {
    this.validateCsrf(req);

    const cookieToken = extractCookie(req.headers.cookie, REFRESH_COOKIE_NAME);
    const rawToken = cookieToken || dto?.refreshToken;

    clearRefreshCookie(res);
    return this.authService.logout(req.headers.authorization, rawToken || undefined);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getProfile(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(
      user.id,
      dto.currentPassword,
      dto.newPassword,
      user.clinicId || undefined,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('revoke-sessions')
  @HttpCode(HttpStatus.OK)
  async revokeSessions(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.revokeSessions(user.id, user.clinicId || undefined);
  }
}
