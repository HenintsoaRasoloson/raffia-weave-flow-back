-- CreateIndex
CREATE INDEX "Client_name_idx" ON "Client"("name");

-- CreateIndex
CREATE INDEX "Client_email_idx" ON "Client"("email");

-- CreateIndex
CREATE INDEX "Client_contactName_idx" ON "Client"("contactName");

-- CreateIndex
CREATE INDEX "Component_name_idx" ON "Component"("name");

-- CreateIndex
CREATE INDEX "Delivery_status_createdAt_idx" ON "Delivery"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Delivery_clientId_createdAt_idx" ON "Delivery"("clientId", "createdAt");

-- CreateIndex
CREATE INDEX "Invoice_status_createdAt_idx" ON "Invoice"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Invoice_clientId_createdAt_idx" ON "Invoice"("clientId", "createdAt");

-- CreateIndex
CREATE INDEX "Invoice_type_createdAt_idx" ON "Invoice"("type", "createdAt");

-- CreateIndex
CREATE INDEX "Product_name_idx" ON "Product"("name");

-- CreateIndex
CREATE INDEX "Product_status_createdAt_idx" ON "Product"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ProductionOrder_status_createdAt_idx" ON "ProductionOrder"("status", "createdAt");

-- CreateIndex
CREATE INDEX "PurchaseOrder_status_createdAt_idx" ON "PurchaseOrder"("status", "createdAt");

-- CreateIndex
CREATE INDEX "PurchaseOrder_supplierId_createdAt_idx" ON "PurchaseOrder"("supplierId", "createdAt");

-- CreateIndex
CREATE INDEX "SalesOrder_status_createdAt_idx" ON "SalesOrder"("status", "createdAt");

-- CreateIndex
CREATE INDEX "SalesOrder_clientId_createdAt_idx" ON "SalesOrder"("clientId", "createdAt");

-- CreateIndex
CREATE INDEX "Supplier_email_idx" ON "Supplier"("email");
