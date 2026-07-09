-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "paidAmount" DECIMAL(12,2);

-- AlterTable
ALTER TABLE "ProductionOrder" ADD COLUMN     "qualityApproved" BOOLEAN NOT NULL DEFAULT false;
