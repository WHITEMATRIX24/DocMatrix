import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { canPerform, RequireOperation } from '../common/decorators/operation-permission.decorator.js';
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

  private assertStatusPermission(user: AuthenticatedUser, status?: string) {
    if (!status) return;
    const value = status.trim().toLowerCase().replace(/_/g, '-');
    const operation = ['in-progress', 'completed'].includes(value)
      ? 'appointment.consult' : value === 'checked-in' ? 'appointment.check_in' : 'appointment.schedule';
    if (!canPerform(user, operation)) throw new ForbiddenException('Your role cannot set this appointment status.');
  }

  @Get('queue')
  @RequireOperation('appointment.read')
  async getLiveQueue(@CurrentUser() user: AuthenticatedUser, @Query('date') date?: string) {
    return this.appointmentsService.getLiveQueue(user.clinicId!, date);
  }

  @Get()
  @RequireOperation('appointment.read')
  async listAppointments(@CurrentUser() user: AuthenticatedUser, @Query() query: AppointmentQueryDto) {
    return this.appointmentsService.listAppointments(user.clinicId!, query);
  }

  @Get(':id')
  @RequireOperation('appointment.read')
  async getAppointment(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.appointmentsService.getAppointment(user.clinicId!, id);
  }

  @Post()
  @RequireOperation('appointment.schedule')
  async createAppointment(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateAppointmentDto) {
    this.assertStatusPermission(user, dto.status);
    return this.appointmentsService.createAppointment(user.clinicId!, dto);
  }

  @Patch(':id')
  @RequireOperation('appointment.check_in')
  async updateAppointment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateAppointmentDto,
  ) {
    const schedulingFields = Object.keys(dto).filter(key => key !== 'status' && (dto as any)[key] !== undefined);
    if (schedulingFields.length && !canPerform(user, 'appointment.schedule')) {
      throw new ForbiddenException('Your role cannot change appointment scheduling fields.');
    }
    this.assertStatusPermission(user, dto.status);
    return this.appointmentsService.updateAppointment(user.clinicId!, id, dto);
  }

  @Post(':id/cancel')
  @RequireOperation('appointment.schedule')
  async cancelAppointment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CancelAppointmentDto,
  ) {
    return this.appointmentsService.cancelAppointment(user.clinicId!, id, dto);
  }
}

