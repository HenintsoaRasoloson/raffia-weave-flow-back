-- Add indexes to speed up product search and listing filters
CREATE INDEX "Product_name_idx" ON "Product"("name");
CREATE INDEX "Product_status_createdAt_idx" ON "Product"("status", "createdAt");
