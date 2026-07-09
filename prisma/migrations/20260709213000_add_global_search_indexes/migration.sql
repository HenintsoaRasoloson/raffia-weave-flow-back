-- Global search performance indexes (optimized for low-latency header search)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Products / Components
CREATE INDEX IF NOT EXISTS "Product_ref_trgm_idx" ON "Product" USING GIN ("ref" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Product_name_trgm_idx" ON "Product" USING GIN ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Component_ref_trgm_idx" ON "Component" USING GIN ("ref" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Component_name_trgm_idx" ON "Component" USING GIN ("name" gin_trgm_ops);

-- Clients / Suppliers
CREATE INDEX IF NOT EXISTS "Client_name_trgm_idx" ON "Client" USING GIN ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Client_email_trgm_idx" ON "Client" USING GIN ("email" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Client_contactName_trgm_idx" ON "Client" USING GIN ("contactName" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Supplier_name_trgm_idx" ON "Supplier" USING GIN ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Supplier_email_trgm_idx" ON "Supplier" USING GIN ("email" gin_trgm_ops);

-- Business documents references
CREATE INDEX IF NOT EXISTS "SalesOrder_orderNumber_trgm_idx" ON "SalesOrder" USING GIN ("orderNumber" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Invoice_invoiceNumber_trgm_idx" ON "Invoice" USING GIN ("invoiceNumber" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Delivery_deliveryNumber_trgm_idx" ON "Delivery" USING GIN ("deliveryNumber" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "ProductionOrder_orderNumber_trgm_idx" ON "ProductionOrder" USING GIN ("orderNumber" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "PurchaseOrder_orderNumber_trgm_idx" ON "PurchaseOrder" USING GIN ("orderNumber" gin_trgm_ops);

-- Composite filters used by advanced search
CREATE INDEX IF NOT EXISTS "SalesOrder_status_createdAt_idx" ON "SalesOrder"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "SalesOrder_clientId_createdAt_idx" ON "SalesOrder"("clientId", "createdAt");
CREATE INDEX IF NOT EXISTS "Invoice_status_createdAt_idx" ON "Invoice"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "Invoice_clientId_createdAt_idx" ON "Invoice"("clientId", "createdAt");
CREATE INDEX IF NOT EXISTS "Invoice_type_createdAt_idx" ON "Invoice"("type", "createdAt");
CREATE INDEX IF NOT EXISTS "Delivery_status_createdAt_idx" ON "Delivery"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "Delivery_clientId_createdAt_idx" ON "Delivery"("clientId", "createdAt");
CREATE INDEX IF NOT EXISTS "ProductionOrder_status_createdAt_idx" ON "ProductionOrder"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "PurchaseOrder_status_createdAt_idx" ON "PurchaseOrder"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "PurchaseOrder_supplierId_createdAt_idx" ON "PurchaseOrder"("supplierId", "createdAt");
