import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ClinicalService } from './clinical.service.js';
import {
  SaveToothConditionDto,
  BatchSaveToothConditionsDto,
} from './dto/save-tooth-condition.dto.js';
import { CreateDocumentDto } from './dto/create-document.dto.js';
import { CreateConsentDto } from './dto/create-consent.dto.js';
import { UpdateConsentDto } from './dto/update-consent.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { TenantGuard } from '../common/guards/tenant.guard.js';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import type { Response } from 'express';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller()
export class ClinicalController {
  constructor(private clinicalService: ClinicalService) {}

  // -------------------------------------------------------------------------
  // CLINIC-LEVEL BULK / SYNC ENDPOINTS
  // -------------------------------------------------------------------------

  @Get('clinical/tooth-charts')
  async getAllClinicToothCharts(@CurrentUser() user: AuthenticatedUser) {
    return this.clinicalService.getAllClinicToothCharts(user.clinicId!);
  }

  @Get('clinical/documents')
  async getAllClinicDocuments(@CurrentUser() user: AuthenticatedUser) {
    return this.clinicalService.getAllClinicDocuments(user.clinicId!);
  }

  @Get('clinical/consents')
  async getAllClinicConsents(@CurrentUser() user: AuthenticatedUser) {
    return this.clinicalService.getAllClinicConsents(user.clinicId!);
  }

  // -------------------------------------------------------------------------
  // 1. TOOTH CHART ENDPOINTS
  // -------------------------------------------------------------------------

  @Get('patients/:patientId/tooth-chart')
  async getToothChart(
    @CurrentUser() user: AuthenticatedUser,
    @Param('patientId') patientId: string,
  ) {
    return this.clinicalService.getToothChart(user.clinicId!, patientId);
  }

  @Put('patients/:patientId/tooth-chart')
  async saveToothCondition(
    @CurrentUser() user: AuthenticatedUser,
    @Param('patientId') patientId: string,
    @Body() dto: SaveToothConditionDto,
  ) {
    return this.clinicalService.saveToothCondition(user.clinicId!, patientId, dto);
  }

  @Post('patients/:patientId/tooth-chart/batch')
  async batchSaveToothChart(
    @CurrentUser() user: AuthenticatedUser,
    @Param('patientId') patientId: string,
    @Body() dto: BatchSaveToothConditionsDto,
  ) {
    return this.clinicalService.batchSaveToothChart(user.clinicId!, patientId, dto);
  }

  // -------------------------------------------------------------------------
  // 2. PATIENT DOCUMENTS ENDPOINTS
  // -------------------------------------------------------------------------

  @Get('patients/:patientId/documents')
  async getDocuments(
    @CurrentUser() user: AuthenticatedUser,
    @Param('patientId') patientId: string,
  ) {
    return this.clinicalService.getDocuments(user.clinicId!, patientId);
  }

  @Post('patients/:patientId/documents')
  async createDocument(
    @CurrentUser() user: AuthenticatedUser,
    @Param('patientId') patientId: string,
    @Body() dto: CreateDocumentDto,
  ) {
    return this.clinicalService.createDocument(user.clinicId!, patientId, dto);
  }

  @Get('patients/:patientId/documents/:docId')
  async getDocument(
    @CurrentUser() user: AuthenticatedUser,
    @Param('patientId') patientId: string,
    @Param('docId') docId: string,
  ) {
    return this.clinicalService.getDocument(user.clinicId!, patientId, docId);
  }

  @Get('patients/:patientId/documents/:docId/download')
  async downloadDocument(
    @CurrentUser() user: AuthenticatedUser,
    @Param('patientId') patientId: string,
    @Param('docId') docId: string,
    @Res() res: Response,
  ) {
    const { fileName, mimeType, buffer } = await this.clinicalService.downloadDocument(
      user.clinicId!,
      patientId,
      docId,
    );

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', buffer.length);
    res.end(buffer);
  }

  @Delete('patients/:patientId/documents/:docId')
  async deleteDocument(
    @CurrentUser() user: AuthenticatedUser,
    @Param('patientId') patientId: string,
    @Param('docId') docId: string,
  ) {
    return this.clinicalService.deleteDocument(user.clinicId!, patientId, docId);
  }

  // -------------------------------------------------------------------------
  // 3. PATIENT CONSENTS ENDPOINTS
  // -------------------------------------------------------------------------

  @Get('patients/:patientId/consents')
  async getConsents(
    @CurrentUser() user: AuthenticatedUser,
    @Param('patientId') patientId: string,
  ) {
    return this.clinicalService.getConsents(user.clinicId!, patientId);
  }

  @Post('patients/:patientId/consents')
  async createConsent(
    @CurrentUser() user: AuthenticatedUser,
    @Param('patientId') patientId: string,
    @Body() dto: CreateConsentDto,
  ) {
    return this.clinicalService.createConsent(
      user.clinicId!,
      patientId,
      dto,
      user.email,
    );
  }

  @Get('patients/:patientId/consents/:consentId')
  async getConsent(
    @CurrentUser() user: AuthenticatedUser,
    @Param('patientId') patientId: string,
    @Param('consentId') consentId: string,
  ) {
    return this.clinicalService.getConsent(user.clinicId!, patientId, consentId);
  }

  @Patch('patients/:patientId/consents/:consentId')
  async updateConsent(
    @CurrentUser() user: AuthenticatedUser,
    @Param('patientId') patientId: string,
    @Param('consentId') consentId: string,
    @Body() dto: UpdateConsentDto,
  ) {
    return this.clinicalService.updateConsent(
      user.clinicId!,
      patientId,
      consentId,
      dto,
    );
  }

  @Delete('patients/:patientId/consents/:consentId')
  async deleteConsent(
    @CurrentUser() user: AuthenticatedUser,
    @Param('patientId') patientId: string,
    @Param('consentId') consentId: string,
  ) {
    return this.clinicalService.deleteConsent(user.clinicId!, patientId, consentId);
  }
}

