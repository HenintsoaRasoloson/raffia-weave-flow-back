-- CreateEnum
CREATE TYPE "BatDocumentKind" AS ENUM ('PREVIEW', 'SENT_TO_CLIENT', 'APPROVED_SIGNED', 'OTHER');

-- CreateEnum
CREATE TYPE "CompressionAlgo" AS ENUM ('NONE', 'GZIP');

-- CreateTable
CREATE TABLE "ProductImage" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "bucket" TEXT,
    "objectKey" TEXT,
    "storagePath" TEXT,
    "originalSize" INTEGER NOT NULL,
    "compressedSize" INTEGER NOT NULL,
    "compressionAlgo" "CompressionAlgo" NOT NULL DEFAULT 'GZIP',
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientFiscalCard" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "bucket" TEXT,
    "objectKey" TEXT,
    "storagePath" TEXT,
    "originalSize" INTEGER NOT NULL,
    "compressedSize" INTEGER NOT NULL,
    "compressionAlgo" "CompressionAlgo" NOT NULL DEFAULT 'GZIP',
    "validUntil" TIMESTAMP(3) NOT NULL,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientFiscalCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BatDocument" (
    "id" TEXT NOT NULL,
    "salesOrderId" TEXT NOT NULL,
    "kind" "BatDocumentKind" NOT NULL DEFAULT 'PREVIEW',
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "bucket" TEXT,
    "objectKey" TEXT,
    "storagePath" TEXT,
    "originalSize" INTEGER NOT NULL,
    "compressedSize" INTEGER NOT NULL,
    "compressionAlgo" "CompressionAlgo" NOT NULL DEFAULT 'NONE',
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BatDocument_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "InvoiceDocument"
    ALTER COLUMN "storagePath" DROP NOT NULL,
    ADD COLUMN "bucket" TEXT,
    ADD COLUMN "objectKey" TEXT,
    ADD COLUMN "originalSize" INTEGER,
    ADD COLUMN "compressedSize" INTEGER,
    ADD COLUMN "compressionAlgo" "CompressionAlgo" NOT NULL DEFAULT 'NONE';

-- CreateIndex
CREATE INDEX "ProductImage_productId_idx" ON "ProductImage"("productId");

-- CreateIndex
CREATE INDEX "ClientFiscalCard_clientId_idx" ON "ClientFiscalCard"("clientId");

-- CreateIndex
CREATE INDEX "ClientFiscalCard_clientId_validUntil_idx" ON "ClientFiscalCard"("clientId", "validUntil");

-- CreateIndex
CREATE INDEX "BatDocument_salesOrderId_idx" ON "BatDocument"("salesOrderId");

-- CreateIndex
CREATE INDEX "BatDocument_salesOrderId_kind_idx" ON "BatDocument"("salesOrderId", "kind");

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientFiscalCard" ADD CONSTRAINT "ClientFiscalCard_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientFiscalCard" ADD CONSTRAINT "ClientFiscalCard_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatDocument" ADD CONSTRAINT "BatDocument_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "SalesOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatDocument" ADD CONSTRAINT "BatDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
