-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'VOID');

-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('CASH', 'CARD', 'UPI', 'NET_BANKING', 'CHEQUE');

-- CreateEnum
CREATE TYPE "InvoicePaymentType" AS ENUM ('PAYMENT', 'REFUND');

-- CreateEnum
CREATE TYPE "GstClass" AS ENUM ('EXEMPT', 'TAXABLE', 'NIL_RATED');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('LAB_FEES', 'DENTAL_SUPPLIES', 'RENT', 'SALARIES', 'UTILITIES', 'EQUIPMENT_MAINTENANCE', 'MARKETING', 'OTHER');

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "treatmentPlanId" TEXT,
    "description" TEXT NOT NULL,
    "notes" TEXT,
    "internalNotes" TEXT,
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "discountTotal" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "taxTotal" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "totalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "balance" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "dueDate" DATE,
    "issuedAt" TIMESTAMPTZ(6),
    "voidedAt" TIMESTAMPTZ(6),
    "voidedById" TEXT,
    "voidReason" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceLineItem" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "serviceTariffId" TEXT,
    "treatmentPlanItemId" TEXT,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "toothNumber" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "discount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "gstRate" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "taxableAmount" DECIMAL(10,2) NOT NULL,
    "taxAmount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoicePayment" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "type" "InvoicePaymentType" NOT NULL DEFAULT 'PAYMENT',
    "amount" DECIMAL(10,2) NOT NULL,
    "mode" "PaymentMode" NOT NULL DEFAULT 'UPI',
    "reference" TEXT,
    "idempotencyKey" TEXT,
    "receivedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receivedById" TEXT,
    "notes" TEXT,
    "refundForPaymentId" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoicePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceTariff" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'General',
    "standardFee" DECIMAL(10,2) NOT NULL,
    "offerPrice" DECIMAL(10,2),
    "gstClass" "GstClass" NOT NULL DEFAULT 'EXEMPT',
    "gstRate" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ServiceTariff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "expenseNumber" TEXT,
    "date" DATE NOT NULL,
    "category" "ExpenseCategory" NOT NULL DEFAULT 'DENTAL_SUPPLIES',
    "description" TEXT NOT NULL,
    "vendor" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "mode" "PaymentMode" NOT NULL DEFAULT 'CASH',
    "reference" TEXT,
    "paidById" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Invoice_clinicId_status_idx" ON "Invoice"("clinicId", "status");

-- CreateIndex
CREATE INDEX "Invoice_clinicId_patientId_idx" ON "Invoice"("clinicId", "patientId");

-- CreateIndex
CREATE INDEX "Invoice_clinicId_createdAt_idx" ON "Invoice"("clinicId", "createdAt");

-- CreateIndex
CREATE INDEX "Invoice_clinicId_balance_idx" ON "Invoice"("clinicId", "balance");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_clinicId_invoiceNumber_key" ON "Invoice"("clinicId", "invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_id_clinicId_key" ON "Invoice"("id", "clinicId");

-- CreateIndex
CREATE INDEX "InvoiceLineItem_invoiceId_idx" ON "InvoiceLineItem"("invoiceId");

-- CreateIndex
CREATE INDEX "InvoiceLineItem_clinicId_idx" ON "InvoiceLineItem"("clinicId");

-- CreateIndex
CREATE INDEX "InvoiceLineItem_serviceTariffId_idx" ON "InvoiceLineItem"("serviceTariffId");

-- CreateIndex
CREATE INDEX "InvoiceLineItem_treatmentPlanItemId_idx" ON "InvoiceLineItem"("treatmentPlanItemId");

-- CreateIndex
CREATE UNIQUE INDEX "InvoicePayment_refundForPaymentId_key" ON "InvoicePayment"("refundForPaymentId");

-- CreateIndex
CREATE INDEX "InvoicePayment_clinicId_invoiceId_idx" ON "InvoicePayment"("clinicId", "invoiceId");

-- CreateIndex
CREATE INDEX "InvoicePayment_clinicId_receivedAt_idx" ON "InvoicePayment"("clinicId", "receivedAt");

-- CreateIndex
CREATE INDEX "InvoicePayment_clinicId_mode_idx" ON "InvoicePayment"("clinicId", "mode");

-- CreateIndex
CREATE INDEX "InvoicePayment_clinicId_reference_idx" ON "InvoicePayment"("clinicId", "reference");

-- CreateIndex
CREATE UNIQUE INDEX "InvoicePayment_clinicId_idempotencyKey_key" ON "InvoicePayment"("clinicId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "ServiceTariff_clinicId_category_idx" ON "ServiceTariff"("clinicId", "category");

-- CreateIndex
CREATE INDEX "ServiceTariff_clinicId_isActive_idx" ON "ServiceTariff"("clinicId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceTariff_clinicId_name_key" ON "ServiceTariff"("clinicId", "name");

-- CreateIndex
CREATE INDEX "Expense_clinicId_date_idx" ON "Expense"("clinicId", "date");

-- CreateIndex
CREATE INDEX "Expense_clinicId_category_idx" ON "Expense"("clinicId", "category");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_patientId_clinicId_fkey" FOREIGN KEY ("patientId", "clinicId") REFERENCES "Patient"("id", "clinicId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_treatmentPlanId_clinicId_fkey" FOREIGN KEY ("treatmentPlanId", "clinicId") REFERENCES "TreatmentPlan"("id", "clinicId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_voidedById_clinicId_fkey" FOREIGN KEY ("voidedById", "clinicId") REFERENCES "User"("id", "clinicId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLineItem" ADD CONSTRAINT "InvoiceLineItem_invoiceId_clinicId_fkey" FOREIGN KEY ("invoiceId", "clinicId") REFERENCES "Invoice"("id", "clinicId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLineItem" ADD CONSTRAINT "InvoiceLineItem_serviceTariffId_fkey" FOREIGN KEY ("serviceTariffId") REFERENCES "ServiceTariff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLineItem" ADD CONSTRAINT "InvoiceLineItem_treatmentPlanItemId_fkey" FOREIGN KEY ("treatmentPlanItemId") REFERENCES "TreatmentPlanItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoicePayment" ADD CONSTRAINT "InvoicePayment_refundForPaymentId_fkey" FOREIGN KEY ("refundForPaymentId") REFERENCES "InvoicePayment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoicePayment" ADD CONSTRAINT "InvoicePayment_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoicePayment" ADD CONSTRAINT "InvoicePayment_invoiceId_clinicId_fkey" FOREIGN KEY ("invoiceId", "clinicId") REFERENCES "Invoice"("id", "clinicId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoicePayment" ADD CONSTRAINT "InvoicePayment_receivedById_clinicId_fkey" FOREIGN KEY ("receivedById", "clinicId") REFERENCES "User"("id", "clinicId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceTariff" ADD CONSTRAINT "ServiceTariff_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_paidById_clinicId_fkey" FOREIGN KEY ("paidById", "clinicId") REFERENCES "User"("id", "clinicId") ON DELETE RESTRICT ON UPDATE CASCADE;

