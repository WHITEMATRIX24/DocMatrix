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
  getSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ReportQueryDto,
  ) {
    return this.reportsService.getSummaryReport(user.clinicId!, user, query);
  }

  @Get('revenue')
  getRevenue(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ReportQueryDto,
  ) {
    return this.reportsService.getRevenueReport(user.clinicId!, user, query);
  }

  @Get('doctors')
  getDoctors(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ReportQueryDto,
  ) {
    return this.reportsService.getDoctorsReport(user.clinicId!, user, query);
  }

  @Get('treatments')
  getTreatments(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ReportQueryDto,
  ) {
    return this.reportsService.getTreatmentsReport(user.clinicId!, user, query);
  }

  @Get('follow-ups')
  getFollowUps(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ReportQueryDto,
  ) {
    return this.reportsService.getFollowUpsReport(user.clinicId!, query);
  }

  @Post('follow-ups/:patientId/contact')
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
