-- AlterTable CompanySetting: devise par défaut + taux 1 EUR = X MGA
ALTER TABLE "CompanySetting" ADD COLUMN "defaultCurrency" TEXT NOT NULL DEFAULT 'MGA';
ALTER TABLE "CompanySetting" ADD COLUMN "eurToMgaRate" DECIMAL(14,4) NOT NULL DEFAULT 5000;

-- Defaults documents / finance → MGA (données existantes inchangées)
ALTER TABLE "SalesOrder" ALTER COLUMN "currency" SET DEFAULT 'MGA';
ALTER TABLE "PurchaseOrder" ALTER COLUMN "currency" SET DEFAULT 'MGA';
ALTER TABLE "Invoice" ALTER COLUMN "currency" SET DEFAULT 'MGA';
ALTER TABLE "FinancialBudget" ALTER COLUMN "currency" SET DEFAULT 'MGA';
ALTER TABLE "LedgerEntry" ALTER COLUMN "currency" SET DEFAULT 'MGA';
