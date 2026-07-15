-- CreateTable
CREATE TABLE "InvoiceDocumentTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "invoiceType" "InvoiceType",
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT NOT NULL DEFAULT 'fr',
    "content" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceDocumentTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InvoiceDocumentTemplate_invoiceType_isDefault_idx" ON "InvoiceDocumentTemplate"("invoiceType", "isDefault");
