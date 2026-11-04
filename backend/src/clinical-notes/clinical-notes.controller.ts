import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ClinicalNotesService } from './clinical-notes.service.js';
import { CreateClinicalNoteDto } from './dto/create-clinical-note.dto.js';
import { UpdateClinicalNoteDto } from './dto/update-clinical-note.dto.js';
import { CreateAddendumDto } from './dto/create-addendum.dto.js';
import { ClinicalNoteQueryDto } from './dto/clinical-note-query.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { TenantGuard } from '../common/guards/tenant.guard.js';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../common/decorators/current-user.decorator.js';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller()
export class ClinicalNotesController {
  constructor(private readonly clinicalNotesService: ClinicalNotesService) {}

  @Post('clinical-notes')
  async createClinicalNote(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateClinicalNoteDto,
  ) {
    return this.clinicalNotesService.createClinicalNote(
      user.clinicId!,
      user,
      dto,
    );
  }

  @Get('clinical-notes')
  async getClinicalNotes(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ClinicalNoteQueryDto,
  ) {
    return this.clinicalNotesService.getClinicalNotes(user.clinicId!, query);
  }

  @Get('clinical-notes/:id')
  async getClinicalNoteById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.clinicalNotesService.getClinicalNoteById(user.clinicId!, id);
  }

  @Patch('clinical-notes/:id')
  async updateClinicalNote(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateClinicalNoteDto,
  ) {
    return this.clinicalNotesService.updateClinicalNote(
      user.clinicId!,
      user,
      id,
      dto,
    );
  }

  @Post('clinical-notes/:id/finalize')
  async finalizeClinicalNote(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.clinicalNotesService.finalizeClinicalNote(
      user.clinicId!,
      user,
      id,
    );
  }

  @Post('clinical-notes/:id/addenda')
  async addAddendum(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreateAddendumDto,
  ) {
    return this.clinicalNotesService.addAddendum(
      user.clinicId!,
      user,
      id,
      dto,
    );
  }

  @Get('patients/:id/clinical-notes')
  async getPatientClinicalNotes(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') patientId: string,
  ) {
    return this.clinicalNotesService.getPatientClinicalNotes(
      user.clinicId!,
      patientId,
    );
  }
}
