import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AppointmentsService } from './appointments.service.js';
import { CreateAppointmentDto } from './dto/create-appointment.dto.js';
import { UpdateAppointmentDto } from './dto/update-appointment.dto.js';
import { AppointmentQueryDto } from './dto/appointment-query.dto.js';
import { CancelAppointmentDto } from './dto/cancel-appointment.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { TenantGuard } from '../common/guards/tenant.guard.js';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator.js';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('appointments')
export class AppointmentsController {
  constructor(private appointmentsService: AppointmentsService) {}

  @Get('queue')
  async getLiveQueue(@CurrentUser() user: AuthenticatedUser, @Query('date') date?: string) {
    return this.appointmentsService.getLiveQueue(user.clinicId!, date);
  }

  @Get()
  async listAppointments(@CurrentUser() user: AuthenticatedUser, @Query() query: AppointmentQueryDto) {
    return this.appointmentsService.listAppointments(user.clinicId!, query);
  }

  @Get(':id')
  async getAppointment(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.appointmentsService.getAppointment(user.clinicId!, id);
  }

  @Post()
  async createAppointment(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateAppointmentDto) {
    return this.appointmentsService.createAppointment(user.clinicId!, dto);
  }

  @Patch(':id')
  async updateAppointment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateAppointmentDto,
  ) {
    return this.appointmentsService.updateAppointment(user.clinicId!, id, dto);
  }

  @Post(':id/cancel')
  async cancelAppointment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CancelAppointmentDto,
  ) {
    return this.appointmentsService.cancelAppointment(user.clinicId!, id, dto);
  }
}

