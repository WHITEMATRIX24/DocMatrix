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
import { BillingPermissionGuard } from './guards/billing-permission.guard.js';
import { RequireBillingPermissions } from './decorators/billing-permission.decorator.js';
import { BillingPermission } from './billing-permissions.policy.js';
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

@UseGuards(JwtAuthGuard, TenantGuard, BillingPermissionGuard)
@Controller('billing')
export class BillingController {
  constructor(
    @Inject(BillingService)
    private readonly billingService: BillingService,
  ) {}

  // ==========================================
  // DASHBOARD
  // ==========================================

  @RequireBillingPermissions(BillingPermission.INVOICE_READ)
  @Get('dashboard')
  async getDashboard(@CurrentUser() user: AuthenticatedUser) {
    return this.billingService.getDashboardOverview(user.clinicId!);
  }

  // ==========================================
  // INVOICES
  // ==========================================

  @RequireBillingPermissions(BillingPermission.INVOICE_CREATE)
  @Post('invoices/draft')
  async createDraftInvoice(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateDraftInvoiceDto,
  ) {
    return this.billingService.createDraftInvoice(user.clinicId!, user, dto);
  }

  @RequireBillingPermissions(BillingPermission.INVOICE_CREATE)
  @Post('invoices/issue')
  async createAndIssueInvoice(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAndIssueInvoiceDto,
  ) {
    return this.billingService.createAndIssueInvoice(user.clinicId!, user, dto);
  }

  @RequireBillingPermissions(BillingPermission.INVOICE_CREATE)
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

  @RequireBillingPermissions(BillingPermission.INVOICE_READ)
  @Get('invoices')
  async getInvoices(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: InvoiceQueryDto,
  ) {
    return this.billingService.getInvoices(user.clinicId!, query);
  }

  @RequireBillingPermissions(BillingPermission.INVOICE_READ)
  @Get('invoices/:id')
  async getInvoiceById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.billingService.getInvoiceById(user.clinicId!, id);
  }

  @RequireBillingPermissions(BillingPermission.INVOICE_UPDATE)
  @Patch('invoices/:id/draft')
  async updateDraftInvoice(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateDraftInvoiceDto,
  ) {
    return this.billingService.updateDraftInvoice(user.clinicId!, user, id, dto);
  }

  @RequireBillingPermissions(BillingPermission.INVOICE_CREATE)
  @Post('invoices/:id/issue')
  async issueDraftInvoice(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.billingService.issueDraftInvoice(user.clinicId!, user, id);
  }

  @RequireBillingPermissions(BillingPermission.INVOICE_VOID)
  @Post('invoices/:id/void')
  async voidInvoice(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: VoidInvoiceDto,
  ) {
    return this.billingService.voidInvoice(user.clinicId!, user, id, dto);
  }

  @RequireBillingPermissions(BillingPermission.INVOICE_VOID)
  @Post('invoices/:id/cancel')
  async cancelInvoice(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: VoidInvoiceDto,
  ) {
    return this.billingService.voidInvoice(user.clinicId!, user, id, dto);
  }

  @RequireBillingPermissions(BillingPermission.INVOICE_VOID)
  @Delete('invoices/:id')
  async deleteInvoice(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.billingService.deleteInvoice(user.clinicId!, user, id);
  }

  // ==========================================
  // PAYMENTS & REFUNDS
  // ==========================================

  @RequireBillingPermissions(BillingPermission.PAYMENT_COLLECT)
  @Post('invoices/:id/payments')
  async recordPayment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') invoiceId: string,
    @Body() dto: RecordPaymentDto,
  ) {
    return this.billingService.recordPayment(user.clinicId!, user, invoiceId, dto);
  }

  @RequireBillingPermissions(BillingPermission.REFUND_ISSUE)
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

  @RequireBillingPermissions(BillingPermission.INVOICE_READ)
  @Get('dues')
  async getPendingDues(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: DuesQueryDto,
  ) {
    return this.billingService.getPendingDues(user.clinicId!, query);
  }

  @RequireBillingPermissions(BillingPermission.INVOICE_READ)
  @Get('dues/patient-wise')
  async getPatientWiseDues(@CurrentUser() user: AuthenticatedUser) {
    return this.billingService.getPatientWiseDues(user.clinicId!);
  }

  // ==========================================
  // COLLECTIONS
  // ==========================================

  @RequireBillingPermissions(BillingPermission.INVOICE_READ)
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

  @RequireBillingPermissions(BillingPermission.TARIFF_MANAGE)
  @Post('tariffs')
  async createTariff(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTariffDto,
  ) {
    return this.billingService.createTariff(user.clinicId!, dto);
  }

  @RequireBillingPermissions(BillingPermission.TARIFF_READ)
  @Get('tariffs')
  async getTariffs(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: TariffQueryDto,
  ) {
    return this.billingService.getTariffs(user.clinicId!, query);
  }

  @RequireBillingPermissions(BillingPermission.TARIFF_READ)
  @Get('tariffs/:id')
  async getTariffById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.billingService.getTariffById(user.clinicId!, id);
  }

  @RequireBillingPermissions(BillingPermission.TARIFF_MANAGE)
  @Patch('tariffs/:id')
  async updateTariff(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateTariffDto,
  ) {
    return this.billingService.updateTariff(user.clinicId!, id, dto);
  }

  @RequireBillingPermissions(BillingPermission.TARIFF_MANAGE)
  @Patch('tariffs/:id/toggle-active')
  async toggleTariffActive(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.billingService.toggleTariffActive(user.clinicId!, id);
  }

  @RequireBillingPermissions(BillingPermission.TARIFF_MANAGE)
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

  @RequireBillingPermissions(BillingPermission.EXPENSE_MANAGE)
  @Post('expenses')
  async createExpense(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateExpenseDto,
  ) {
    return this.billingService.createExpense(user.clinicId!, user, dto);
  }

  @RequireBillingPermissions(BillingPermission.EXPENSE_READ)
  @Get('expenses')
  async getExpenses(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ExpenseQueryDto,
  ) {
    return this.billingService.getExpenses(user.clinicId!, query);
  }

  @RequireBillingPermissions(BillingPermission.EXPENSE_READ)
  @Get('expenses/summary')
  async getExpenseSummary(@CurrentUser() user: AuthenticatedUser) {
    return this.billingService.getExpenseSummary(user.clinicId!);
  }

  @RequireBillingPermissions(BillingPermission.EXPENSE_READ)
  @Get('expenses/:id')
  async getExpenseById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.billingService.getExpenseById(user.clinicId!, id);
  }

  @RequireBillingPermissions(BillingPermission.EXPENSE_MANAGE)
  @Patch('expenses/:id')
  async updateExpense(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateExpenseDto,
  ) {
    return this.billingService.updateExpense(user.clinicId!, id, dto);
  }

  @RequireBillingPermissions(BillingPermission.EXPENSE_MANAGE)
  @Delete('expenses/:id')
  async deleteExpense(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.billingService.deleteExpense(user.clinicId!, id);
  }
}
