-- Link business reference level to related child entities for global traceability
ALTER TABLE "BatDocument"
ADD COLUMN "referenceLevel" INTEGER;

ALTER TABLE "SalesOrderItem"
ADD COLUMN "referenceLevel" INTEGER;

ALTER TABLE "ProductionStep"
ADD COLUMN "referenceLevel" INTEGER;

ALTER TABLE "PurchaseOrderItem"
ADD COLUMN "referenceLevel" INTEGER;

ALTER TABLE "InvoiceDocument"
ADD COLUMN "referenceLevel" INTEGER;

ALTER TABLE "InvoiceItem"
ADD COLUMN "referenceLevel" INTEGER;

ALTER TABLE "InvoicePayment"
ADD COLUMN "referenceLevel" INTEGER;

CREATE INDEX "BatDocument_referenceLevel_idx" ON "BatDocument"("referenceLevel");
CREATE INDEX "SalesOrderItem_referenceLevel_idx" ON "SalesOrderItem"("referenceLevel");
CREATE INDEX "ProductionStep_referenceLevel_idx" ON "ProductionStep"("referenceLevel");
CREATE INDEX "PurchaseOrderItem_referenceLevel_idx" ON "PurchaseOrderItem"("referenceLevel");
CREATE INDEX "InvoiceDocument_referenceLevel_idx" ON "InvoiceDocument"("referenceLevel");
CREATE INDEX "InvoiceItem_referenceLevel_idx" ON "InvoiceItem"("referenceLevel");
CREATE INDEX "InvoicePayment_referenceLevel_idx" ON "InvoicePayment"("referenceLevel");
