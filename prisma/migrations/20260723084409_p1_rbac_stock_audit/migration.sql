-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'PRODUCTION_MATERIALS_CONSUMED';
ALTER TYPE "AuditAction" ADD VALUE 'PURCHASE_ORDER_RECEIVED';
ALTER TYPE "AuditAction" ADD VALUE 'PURCHASE_ORDER_PAYMENT_RECORDED';
ALTER TYPE "AuditAction" ADD VALUE 'STOCK_ADJUSTED';
ALTER TYPE "AuditAction" ADD VALUE 'LEDGER_ENTRY_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'USER_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'USER_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'COMPANY_SETTINGS_UPDATED';

-- AlterTable
ALTER TABLE "ProductionOrder" ADD COLUMN     "materialsConsumedAt" TIMESTAMP(3);
