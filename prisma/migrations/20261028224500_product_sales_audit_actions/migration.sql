-- AlterEnum
-- Journal d'activité : produit, commande (mise à jour), fiche technique.

ALTER TYPE "AuditAction" ADD VALUE 'SALES_ORDER_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'PRODUCT_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'PRODUCT_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'PRODUCT_TECHNICAL_SHEET_UPDATED';
