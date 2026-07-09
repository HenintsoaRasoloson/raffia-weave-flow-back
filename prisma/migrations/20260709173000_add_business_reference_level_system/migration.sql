-- Shared sequence table for business documents
CREATE TABLE "DocumentSequence" (
  "scope" TEXT NOT NULL,
  "nextValue" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DocumentSequence_pkey" PRIMARY KEY ("scope")
);

-- Common level for linked business documents (sales order + invoices)
ALTER TABLE "SalesOrder"
ADD COLUMN "referenceLevel" INTEGER;

ALTER TABLE "Invoice"
ADD COLUMN "referenceLevel" INTEGER;

CREATE UNIQUE INDEX "SalesOrder_referenceLevel_key" ON "SalesOrder"("referenceLevel");
CREATE INDEX "Invoice_referenceLevel_idx" ON "Invoice"("referenceLevel");
