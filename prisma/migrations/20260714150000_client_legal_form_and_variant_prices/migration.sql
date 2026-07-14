-- CreateEnum
CREATE TYPE "ClientLegalForm" AS ENUM ('INDIVIDUAL', 'COMPANY');

-- AlterTable
ALTER TABLE "Client" ADD COLUMN "legalForm" "ClientLegalForm" NOT NULL DEFAULT 'INDIVIDUAL';
ALTER TABLE "Client" ADD COLUMN "nif" TEXT;
ALTER TABLE "Client" ADD COLUMN "stat" TEXT;

-- CreateTable
CREATE TABLE "ClientVariantPrice" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "agreedPriceHt" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientVariantPrice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Client_type_legalForm_idx" ON "Client"("type", "legalForm");
CREATE INDEX "Client_nif_idx" ON "Client"("nif");
CREATE INDEX "Client_stat_idx" ON "Client"("stat");
CREATE INDEX "ClientVariantPrice_clientId_productId_idx" ON "ClientVariantPrice"("clientId", "productId");
CREATE UNIQUE INDEX "ClientVariantPrice_clientId_variantId_key" ON "ClientVariantPrice"("clientId", "variantId");

-- AddForeignKey
ALTER TABLE "ClientVariantPrice" ADD CONSTRAINT "ClientVariantPrice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClientVariantPrice" ADD CONSTRAINT "ClientVariantPrice_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClientVariantPrice" ADD CONSTRAINT "ClientVariantPrice_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
