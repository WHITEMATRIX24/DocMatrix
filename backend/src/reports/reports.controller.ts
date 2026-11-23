import {
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ReportsService } from './reports.service.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { TenantGuard } from '../common/guards/tenant.guard.js';
import { RequireOperation } from '../common/decorators/operation-permission.decorator.js';
import {
  CurrentUser,
  AuthenticatedUser,
} from '../common/decorators/current-user.decorator.js';
import { ReportQueryDto } from './dto/report-query.dto.js';

@Controller('reports')
@UseGuards(JwtAuthGuard, TenantGuard)
export class ReportsController {
  constructor(
    @Inject(ReportsService)
    private readonly reportsService: ReportsService,
  ) {}

  @Get('summary')
  @RequireOperation('report.summary')
  getSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ReportQueryDto,
  ) {
    return this.reportsService.getSummaryReport(user.clinicId!, user, query);
  }

  @Get('revenue')
  @RequireOperation('report.financial')
  getRevenue(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ReportQueryDto,
  ) {
    return this.reportsService.getRevenueReport(user.clinicId!, user, query);
  }

  @Get('doctors')
  @RequireOperation('report.clinical')
  getDoctors(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ReportQueryDto,
  ) {
    return this.reportsService.getDoctorsReport(user.clinicId!, user, query);
  }

  @Get('treatments')
  @RequireOperation('report.clinical')
  getTreatments(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ReportQueryDto,
  ) {
    return this.reportsService.getTreatmentsReport(user.clinicId!, user, query);
  }

  @Get('follow-ups')
  @RequireOperation('report.follow_up')
  getFollowUps(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ReportQueryDto,
  ) {
    return this.reportsService.getFollowUpsReport(user.clinicId!, query, user);
  }

  @Post('follow-ups/:patientId/contact')
  @RequireOperation('report.follow_up')
  markPatientContacted(
    @CurrentUser() user: AuthenticatedUser,
    @Param('patientId') patientId: string,
  ) {
    return this.reportsService.markPatientContacted(
      user.clinicId!,
      user,
      patientId,
    );
  }

  @Delete('follow-ups/:patientId/contact')
  @RequireOperation('report.follow_up')
  unmarkPatientContacted(
    @CurrentUser() user: AuthenticatedUser,
    @Param('patientId') patientId: string,
  ) {
    return this.reportsService.unmarkPatientContacted(
      user.clinicId!,
      user,
      patientId,
    );
  }
}
