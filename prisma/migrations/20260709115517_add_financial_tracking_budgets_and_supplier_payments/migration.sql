-- CreateEnum
CREATE TYPE "BudgetDirection" AS ENUM ('INCOME', 'EXPENSE');

-- AlterTable
ALTER TABLE "LedgerEntry" ADD COLUMN     "ledgerCategoryId" TEXT;

-- AlterTable
ALTER TABLE "PurchaseOrder" ADD COLUMN     "paidAmount" DECIMAL(12,2),
ADD COLUMN     "paidAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "PurchaseOrderPayment" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseOrderPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerCategory" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "entryType" "LedgerEntryType" NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LedgerCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialBudget" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "direction" "BudgetDirection" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "ledgerCategoryId" TEXT,
    "clientId" TEXT,
    "supplierId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialBudget_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PurchaseOrderPayment_purchaseOrderId_paidAt_idx" ON "PurchaseOrderPayment"("purchaseOrderId", "paidAt");

-- CreateIndex
CREATE UNIQUE INDEX "LedgerCategory_code_key" ON "LedgerCategory"("code");

-- CreateIndex
CREATE INDEX "LedgerCategory_entryType_active_idx" ON "LedgerCategory"("entryType", "active");

-- CreateIndex
CREATE INDEX "FinancialBudget_periodStart_periodEnd_idx" ON "FinancialBudget"("periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "FinancialBudget_ledgerCategoryId_periodStart_periodEnd_idx" ON "FinancialBudget"("ledgerCategoryId", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "FinancialBudget_clientId_periodStart_periodEnd_idx" ON "FinancialBudget"("clientId", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "FinancialBudget_supplierId_periodStart_periodEnd_idx" ON "FinancialBudget"("supplierId", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "LedgerEntry_ledgerCategoryId_entryDate_idx" ON "LedgerEntry"("ledgerCategoryId", "entryDate");

-- AddForeignKey
ALTER TABLE "PurchaseOrderPayment" ADD CONSTRAINT "PurchaseOrderPayment_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialBudget" ADD CONSTRAINT "FinancialBudget_ledgerCategoryId_fkey" FOREIGN KEY ("ledgerCategoryId") REFERENCES "LedgerCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialBudget" ADD CONSTRAINT "FinancialBudget_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialBudget" ADD CONSTRAINT "FinancialBudget_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_ledgerCategoryId_fkey" FOREIGN KEY ("ledgerCategoryId") REFERENCES "LedgerCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
