-- CreateEnum
CREATE TYPE "InvoiceDocumentKind" AS ENUM ('SIGNED', 'STAMPED', 'SIGNED_AND_STAMPED', 'OTHER');

-- CreateTable
CREATE TABLE "InvoiceTemplate" (
    "id" TEXT NOT NULL,
    "type" "InvoiceType" NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "footer" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceDocument" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "kind" "InvoiceDocumentKind" NOT NULL DEFAULT 'SIGNED',
    "originalName" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceTemplate_type_key" ON "InvoiceTemplate"("type");

-- CreateIndex
CREATE INDEX "InvoiceDocument_invoiceId_idx" ON "InvoiceDocument"("invoiceId");

-- CreateIndex
CREATE INDEX "InvoiceDocument_invoiceId_kind_idx" ON "InvoiceDocument"("invoiceId", "kind");

-- AddForeignKey
ALTER TABLE "InvoiceDocument" ADD CONSTRAINT "InvoiceDocument_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceDocument" ADD CONSTRAINT "InvoiceDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
