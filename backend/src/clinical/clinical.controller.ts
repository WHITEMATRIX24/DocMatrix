import { CLINICAL_UPLOAD_LIMITS, clinicalDownloadHeaders } from '../storage/upload-limits.js';
import { RequireOperation } from '../common/decorators/operation-permission.decorator.js';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ClinicalService } from './clinical.service.js';
import {
  SaveToothConditionDto,
  BatchSaveToothConditionsDto,
} from './dto/save-tooth-condition.dto.js';
import { CreateDocumentDto } from './dto/create-document.dto.js';
import { CreateConsentDto } from './dto/create-consent.dto.js';
import { UpdateConsentDto } from './dto/update-consent.dto.js';
import {
  CreateConsentTemplateDto,
  UpdateConsentTemplateDto,
} from './dto/consent-template.dto.js';
import {
  CancelConsentDto,
  DeclineConsentDto,
  GenerateConsentDto,
  SubmitGuardianSignatureDto,
  SubmitPatientSignatureDto,
  VerifyConsentDto,
} from './dto/consent-workflow.dto.js';
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
  @RequireOperation('clinical.read')
  async getAllClinicToothCharts(@CurrentUser() user: AuthenticatedUser) {
    return this.clinicalService.getAllClinicToothCharts(user.clinicId!);
  }

  @Get('clinical/documents')
  @RequireOperation('document.read')
  async getAllClinicDocuments(@CurrentUser() user: AuthenticatedUser) {
    return this.clinicalService.getAllClinicDocuments(user.clinicId!, user);
  }

  @Get('clinical/consents')
  @RequireOperation('consent.read')
  async getAllClinicConsents(@CurrentUser() user: AuthenticatedUser) {
    return this.clinicalService.getAllClinicConsents(user.clinicId!);
  }

  @Get('clinical/consent-templates')
  @RequireOperation('consent.read')
  async getConsentTemplates(
    @CurrentUser() user: AuthenticatedUser,
    @Query('activeOnly') activeOnly?: string,
  ) {
    return this.clinicalService.getConsentTemplates(user.clinicId!, activeOnly !== 'true');
  }

  @Post('clinical/consent-templates')
  @RequireOperation('consent.template.manage')
  async createConsentTemplate(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateConsentTemplateDto,
  ) {
    return this.clinicalService.createConsentTemplate(user.clinicId!, dto, user);
  }

  @Patch('clinical/consent-templates/:templateId')
  @RequireOperation('consent.template.manage')
  async updateConsentTemplate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('templateId') templateId: string,
    @Body() dto: UpdateConsentTemplateDto,
  ) {
    return this.clinicalService.updateConsentTemplate(user.clinicId!, templateId, dto, user);
  }

  @Get('appointments/:appointmentId/consents')
  @RequireOperation('consent.read')
  async getAppointmentConsents(
    @CurrentUser() user: AuthenticatedUser,
    @Param('appointmentId') appointmentId: string,
  ) {
    return this.clinicalService.getAppointmentConsents(user.clinicId!, appointmentId);
  }

  // -------------------------------------------------------------------------
  // 1. TOOTH CHART ENDPOINTS
  // -------------------------------------------------------------------------

  @Get('patients/:patientId/tooth-chart')
  @RequireOperation('clinical.read')
  async getToothChart(
    @CurrentUser() user: AuthenticatedUser,
    @Param('patientId') patientId: string,
  ) {
    return this.clinicalService.getToothChart(user.clinicId!, patientId);
  }

  @Get('patients/:patientId/tooth-chart/history')
  @RequireOperation('clinical.read')
  getToothChartHistory(@CurrentUser() user: AuthenticatedUser, @Param('patientId') patientId: string) {
    return this.clinicalService.getToothChartHistory(user.clinicId!, patientId);
  }

  @Put('patients/:patientId/tooth-chart')
  @RequireOperation('clinical.write')
  async saveToothCondition(
    @CurrentUser() user: AuthenticatedUser,
    @Param('patientId') patientId: string,
    @Body() dto: SaveToothConditionDto,
  ) {
    return this.clinicalService.saveToothCondition(user.clinicId!, patientId, dto, user);
  }

  @Post('patients/:patientId/tooth-chart/batch')
  @RequireOperation('clinical.write')
  async batchSaveToothChart(
    @CurrentUser() user: AuthenticatedUser,
    @Param('patientId') patientId: string,
    @Body() dto: BatchSaveToothConditionsDto,
  ) {
    return this.clinicalService.batchSaveToothChart(user.clinicId!, patientId, dto, user);
  }

  // -------------------------------------------------------------------------
  // 2. PATIENT DOCUMENTS ENDPOINTS
  // -------------------------------------------------------------------------

  @Get('patients/:patientId/documents')
  @RequireOperation('document.read')
  async getDocuments(
    @CurrentUser() user: AuthenticatedUser,
    @Param('patientId') patientId: string,
  ) {
    return this.clinicalService.getDocuments(user.clinicId!, patientId, user);
  }

  @Post('patients/:patientId/documents')
  @UseInterceptors(FileInterceptor('file', { limits: CLINICAL_UPLOAD_LIMITS }))
  @RequireOperation('document.write')
  async createDocument(
    @CurrentUser() user: AuthenticatedUser,
    @Param('patientId') patientId: string,
    @Body() dto: CreateDocumentDto,
    @UploadedFile() file?: any,
  ) {
    return this.clinicalService.createDocument(user.clinicId!, patientId, dto, file, user);
  }

  @Get('patients/:patientId/documents/:docId')
  @RequireOperation('document.read')
  async getDocument(
    @CurrentUser() user: AuthenticatedUser,
    @Param('patientId') patientId: string,
    @Param('docId') docId: string,
  ) {
    return this.clinicalService.getDocument(user.clinicId!, patientId, docId, user);
  }

  @Get('patients/:patientId/documents/:docId/signed-url')
  @RequireOperation('document.read')
  async getDocumentSignedUrl(
    @CurrentUser() user: AuthenticatedUser,
    @Param('patientId') patientId: string,
    @Param('docId') docId: string,
  ) {
    return this.clinicalService.getDocumentSignedUrl(user.clinicId!, patientId, docId, user);
  }

  @Get('patients/:patientId/documents/:docId/download')
  @RequireOperation('document.read')
  async downloadDocument(
    @CurrentUser() user: AuthenticatedUser,
    @Param('patientId') patientId: string,
    @Param('docId') docId: string,
    @Query('redirect') redirect: string,
    @Res() res: Response,
  ) {
    const { fileName, mimeType, buffer, signedUrl } = await this.clinicalService.downloadDocument(
      user.clinicId!,
      patientId,
      docId,
      user,
    );

    if (redirect === 'true' && signedUrl) {
      return res.redirect(signedUrl);
    }

    clinicalDownloadHeaders(res, false);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.setHeader('Content-Length', buffer.length);
    res.end(buffer);
  }

  @Get('patients/:patientId/documents/:docId/preview')
  @RequireOperation('document.read')
  async previewDocument(
    @CurrentUser() user: AuthenticatedUser,
    @Param('patientId') patientId: string,
    @Param('docId') docId: string,
    @Query('redirect') _redirect: string,
    @Res() res: Response,
  ) {
    const { fileName, mimeType, buffer } = await this.clinicalService.downloadDocument(
      user.clinicId!,
      patientId,
      docId,
      user,
    );

    // Preview always passes through the sandboxed backend response.
    clinicalDownloadHeaders(res, true);
    const inline = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'].includes(mimeType);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename="${encodeURIComponent(fileName)}"`);
    res.setHeader('Content-Length', buffer.length);
    res.end(buffer);
  }

  @Delete('patients/:patientId/documents/:docId')
  @RequireOperation('document.delete')
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
  @RequireOperation('consent.read')
  async getConsents(
    @CurrentUser() user: AuthenticatedUser,
    @Param('patientId') patientId: string,
  ) {
    return this.clinicalService.getConsents(user.clinicId!, patientId);
  }

  @Post('patients/:patientId/consents')
  @RequireOperation('consent.write')
  async createConsent(
    @CurrentUser() user: AuthenticatedUser,
    @Param('patientId') patientId: string,
    @Body() dto: CreateConsentDto,
  ) {
    return this.clinicalService.createConsent(
      user.clinicId!,
      patientId,
      dto,
      user,
    );
  }

  @Get('patients/:patientId/consents/:consentId')
  @RequireOperation('consent.read')
  async getConsent(
    @CurrentUser() user: AuthenticatedUser,
    @Param('patientId') patientId: string,
    @Param('consentId') consentId: string,
  ) {
    return this.clinicalService.getConsent(user.clinicId!, patientId, consentId);
  }

  @Get('patients/:patientId/consents/:consentId/history')
  @RequireOperation('consent.read')
  consentHistory(@CurrentUser() user: AuthenticatedUser, @Param('patientId') patientId: string, @Param('consentId') consentId: string) { return this.clinicalService.consentHistory(user.clinicId!, patientId, consentId); }

  @Patch('patients/:patientId/consents/:consentId')
  @RequireOperation('consent.write')
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
      user,
    );
  }

  @Delete('patients/:patientId/consents/:consentId')
  @RequireOperation('consent.delete')
  async deleteConsent(
    @CurrentUser() user: AuthenticatedUser,
    @Param('patientId') patientId: string,
    @Param('consentId') consentId: string,
  ) {
    return this.clinicalService.deleteConsent(user.clinicId!, patientId, consentId, user);
  }

  @Post('patients/:patientId/consents/generate')
  @RequireOperation('consent.write')
  async generateConsent(
    @CurrentUser() user: AuthenticatedUser,
    @Param('patientId') patientId: string,
    @Body() dto: GenerateConsentDto,
  ) {
    return this.clinicalService.generateConsentForProcedure(user.clinicId!, patientId, dto, user);
  }

  @Post('patients/:patientId/consents/:consentId/sign-patient')
  @RequireOperation('consent.write')
  async signConsentPatient(
    @CurrentUser() user: AuthenticatedUser,
    @Param('patientId') patientId: string,
    @Param('consentId') consentId: string,
    @Body() dto: SubmitPatientSignatureDto,
  ) {
    return this.clinicalService.submitPatientSignature(user.clinicId!, patientId, consentId, dto, user);
  }

  @Post('patients/:patientId/consents/:consentId/sign-guardian')
  @RequireOperation('consent.write')
  async signConsentGuardian(
    @CurrentUser() user: AuthenticatedUser,
    @Param('patientId') patientId: string,
    @Param('consentId') consentId: string,
    @Body() dto: SubmitGuardianSignatureDto,
  ) {
    return this.clinicalService.submitGuardianSignature(user.clinicId!, patientId, consentId, dto, user);
  }

  @Post('patients/:patientId/consents/:consentId/verify-dentist')
  @RequireOperation('consent.verify')
  async verifyConsentDentist(
    @CurrentUser() user: AuthenticatedUser,
    @Param('patientId') patientId: string,
    @Param('consentId') consentId: string,
    @Body() dto: VerifyConsentDto,
  ) {
    return this.clinicalService.verifyConsentByDentist(user.clinicId!, patientId, consentId, dto, user);
  }

  @Post('patients/:patientId/consents/:consentId/decline')
  @RequireOperation('consent.write')
  async declineConsent(
    @CurrentUser() user: AuthenticatedUser,
    @Param('patientId') patientId: string,
    @Param('consentId') consentId: string,
    @Body() dto: DeclineConsentDto,
  ) {
    return this.clinicalService.declineConsent(user.clinicId!, patientId, consentId, dto, user);
  }

  @Post('patients/:patientId/consents/:consentId/cancel')
  @RequireOperation('consent.write')
  async cancelConsent(
    @CurrentUser() user: AuthenticatedUser,
    @Param('patientId') patientId: string,
    @Param('consentId') consentId: string,
    @Body() dto: CancelConsentDto,
  ) {
    return this.clinicalService.cancelConsent(user.clinicId!, patientId, consentId, dto, user);
  }

  @Post('patients/:patientId/consents/:consentId/replace')
  @RequireOperation('consent.write')
  async replaceConsent(
    @CurrentUser() user: AuthenticatedUser,
    @Param('patientId') patientId: string,
    @Param('consentId') consentId: string,
  ) {
    return this.clinicalService.replaceConsent(user.clinicId!, patientId, consentId, user);
  }

  @Get('patients/:patientId/consents/:consentId/pdf')
  @RequireOperation('consent.read')
  async downloadConsentPdf(
    @CurrentUser() user: AuthenticatedUser,
    @Param('patientId') patientId: string,
    @Param('consentId') consentId: string,
    @Res() res: Response,
  ) {
    const { fileName, mimeType, buffer } = await this.clinicalService.downloadConsentPdf(
      user.clinicId!,
      patientId,
      consentId,
    );
    clinicalDownloadHeaders(res, false);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.setHeader('Content-Length', buffer.length);
    res.end(buffer);
  }
}

