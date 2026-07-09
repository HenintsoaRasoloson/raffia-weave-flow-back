-- Extend shared reference level to additional business documents
ALTER TABLE "ProductionOrder"
ADD COLUMN "referenceLevel" INTEGER;

ALTER TABLE "PurchaseOrder"
ADD COLUMN "referenceLevel" INTEGER;

ALTER TABLE "Delivery"
ADD COLUMN "referenceLevel" INTEGER;

CREATE INDEX "ProductionOrder_referenceLevel_idx" ON "ProductionOrder"("referenceLevel");
CREATE INDEX "PurchaseOrder_referenceLevel_idx" ON "PurchaseOrder"("referenceLevel");
CREATE INDEX "Delivery_referenceLevel_idx" ON "Delivery"("referenceLevel");
