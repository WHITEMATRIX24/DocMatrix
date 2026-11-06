import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { BillingService } from './billing.service.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { TenantGuard } from '../common/guards/tenant.guard.js';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../common/decorators/current-user.decorator.js';
import { CreateDraftInvoiceDto } from './dto/create-draft-invoice.dto.js';
import { UpdateDraftInvoiceDto } from './dto/update-draft-invoice.dto.js';
import { CreateAndIssueInvoiceDto } from './dto/issue-invoice.dto.js';
import { VoidInvoiceDto } from './dto/void-invoice.dto.js';
import { InvoiceQueryDto } from './dto/invoice-query.dto.js';
import { RecordPaymentDto } from './dto/record-payment.dto.js';
import { RefundPaymentDto } from './dto/refund-payment.dto.js';
import { DuesQueryDto } from './dto/dues-query.dto.js';
import { CollectionQueryDto } from './dto/collection-query.dto.js';
import { CreateTariffDto } from './dto/create-tariff.dto.js';
import { UpdateTariffDto } from './dto/update-tariff.dto.js';
import { TariffQueryDto } from './dto/tariff-query.dto.js';
import { CreateExpenseDto } from './dto/create-expense.dto.js';
import { UpdateExpenseDto } from './dto/update-expense.dto.js';
import { ExpenseQueryDto } from './dto/expense-query.dto.js';
import { InvoiceFromTreatmentPlanDto } from './dto/invoice-from-treatment-plan.dto.js';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('billing')
export class BillingController {
  constructor(
    @Inject(BillingService)
    private readonly billingService: BillingService,
  ) {}

  // ==========================================
  // DASHBOARD
  // ==========================================

  @Get('dashboard')
  async getDashboard(@CurrentUser() user: AuthenticatedUser) {
    return this.billingService.getDashboardOverview(user.clinicId!);
  }

  // ==========================================
  // INVOICES
  // ==========================================

  @Post('invoices/draft')
  async createDraftInvoice(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateDraftInvoiceDto,
  ) {
    return this.billingService.createDraftInvoice(user.clinicId!, user, dto);
  }

  @Post('invoices/issue')
  async createAndIssueInvoice(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAndIssueInvoiceDto,
  ) {
    return this.billingService.createAndIssueInvoice(user.clinicId!, user, dto);
  }

  @Post('invoices/from-treatment-plan')
  async createFromTreatmentPlan(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: InvoiceFromTreatmentPlanDto,
  ) {
    return this.billingService.createInvoiceFromTreatmentPlan(
      user.clinicId!,
      user,
      dto,
    );
  }

  @Get('invoices')
  async getInvoices(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: InvoiceQueryDto,
  ) {
    return this.billingService.getInvoices(user.clinicId!, query);
  }

  @Get('invoices/:id')
  async getInvoiceById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.billingService.getInvoiceById(user.clinicId!, id);
  }

  @Patch('invoices/:id/draft')
  async updateDraftInvoice(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateDraftInvoiceDto,
  ) {
    return this.billingService.updateDraftInvoice(user.clinicId!, user, id, dto);
  }

  @Post('invoices/:id/issue')
  async issueDraftInvoice(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.billingService.issueDraftInvoice(user.clinicId!, user, id);
  }

  @Post('invoices/:id/void')
  async voidInvoice(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: VoidInvoiceDto,
  ) {
    return this.billingService.voidInvoice(user.clinicId!, user, id, dto);
  }

  // ==========================================
  // PAYMENTS & REFUNDS
  // ==========================================

  @Post('invoices/:id/payments')
  async recordPayment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') invoiceId: string,
    @Body() dto: RecordPaymentDto,
  ) {
    return this.billingService.recordPayment(user.clinicId!, user, invoiceId, dto);
  }

  @Post('payments/:id/refund')
  async refundPayment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') paymentId: string,
    @Body() dto: RefundPaymentDto,
  ) {
    return this.billingService.refundPayment(user.clinicId!, user, paymentId, dto);
  }

  // ==========================================
  // PENDING DUES & AGING
  // ==========================================

  @Get('dues')
  async getPendingDues(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: DuesQueryDto,
  ) {
    return this.billingService.getPendingDues(user.clinicId!, query);
  }

  @Get('dues/patient-wise')
  async getPatientWiseDues(@CurrentUser() user: AuthenticatedUser) {
    return this.billingService.getPatientWiseDues(user.clinicId!);
  }

  // ==========================================
  // COLLECTIONS
  // ==========================================

  @Get('collections/daily')
  async getDailyCollections(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: CollectionQueryDto,
  ) {
    return this.billingService.getDailyCollections(user.clinicId!, query);
  }

  // ==========================================
  // SERVICE TARIFFS
  // ==========================================

  @Post('tariffs')
  async createTariff(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTariffDto,
  ) {
    return this.billingService.createTariff(user.clinicId!, dto);
  }

  @Get('tariffs')
  async getTariffs(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: TariffQueryDto,
  ) {
    return this.billingService.getTariffs(user.clinicId!, query);
  }

  @Get('tariffs/:id')
  async getTariffById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.billingService.getTariffById(user.clinicId!, id);
  }

  @Patch('tariffs/:id')
  async updateTariff(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateTariffDto,
  ) {
    return this.billingService.updateTariff(user.clinicId!, id, dto);
  }

  @Patch('tariffs/:id/toggle-active')
  async toggleTariffActive(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.billingService.toggleTariffActive(user.clinicId!, id);
  }

  @Delete('tariffs/:id')
  async deleteTariff(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.billingService.deleteTariff(user.clinicId!, id);
  }

  // ==========================================
  // EXPENSES
  // ==========================================

  @Post('expenses')
  async createExpense(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateExpenseDto,
  ) {
    return this.billingService.createExpense(user.clinicId!, user, dto);
  }

  @Get('expenses')
  async getExpenses(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ExpenseQueryDto,
  ) {
    return this.billingService.getExpenses(user.clinicId!, query);
  }

  @Get('expenses/summary')
  async getExpenseSummary(@CurrentUser() user: AuthenticatedUser) {
    return this.billingService.getExpenseSummary(user.clinicId!);
  }

  @Get('expenses/:id')
  async getExpenseById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.billingService.getExpenseById(user.clinicId!, id);
  }

  @Patch('expenses/:id')
  async updateExpense(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateExpenseDto,
  ) {
    return this.billingService.updateExpense(user.clinicId!, id, dto);
  }

  @Delete('expenses/:id')
  async deleteExpense(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.billingService.deleteExpense(user.clinicId!, id);
  }
}

