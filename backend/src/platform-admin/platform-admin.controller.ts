import { BadRequestException, Controller, Get, Header, Inject, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { PlatformAdminOnly } from '../common/decorators/platform-admin.decorator.js';
import { AuthenticatedUser, CurrentUser } from '../common/decorators/current-user.decorator.js';
import { PlatformAdminService } from './platform-admin.service.js';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@PlatformAdminOnly()
export class PlatformAdminController {
  constructor(@Inject(PlatformAdminService) private readonly service: PlatformAdminService) {}

  private directory(kind: 'clinics' | 'subscriptions' | 'users', query: Record<string, string>) {
    if (Object.values(query).some(value => typeof value !== 'string')) throw new BadRequestException('Invalid directory filters.');
    const { page = '1', search = '', status } = query;
    if (!/^\d+$/.test(page) || Number(page) < 1 || Number(page) > 100000 || search.length > 100 ||
      (status && !['ACTIVE', 'TRIAL', 'SUSPENDED', 'READ_ONLY', 'CLOSED'].includes(status)) ||
      Object.keys(query).some(k => !['page', 'search', 'status'].includes(k))) throw new BadRequestException('Invalid directory filters.');
    return this.service.getDirectory(kind, Number(page), search.trim(), status);
  }

  @Get('clinics')
  @Header('Cache-Control', 'no-store')
  clinics(@Query() query: Record<string, string>) { return this.directory('clinics', query); }

  @Get('subscriptions')
  @Header('Cache-Control', 'no-store')
  subscriptions(@Query() query: Record<string, string>) { return this.directory('subscriptions', query); }

  @Get('users')
  @Header('Cache-Control', 'no-store')
  users(@Query() query: Record<string, string>) { return this.directory('users', query); }

  @Get('dashboard')
  @Header('Cache-Control', 'no-store')
  async getDashboard(@CurrentUser() user: AuthenticatedUser) {
    return {
      user: { id: user.id, email: user.email, fullName: user.fullName, isPlatformAdmin: user.isPlatformAdmin },
      summary: await this.service.getSummary(),
      overview: await this.service.getOverview(),
      generatedAt: new Date().toISOString(),
    };
  }
}
