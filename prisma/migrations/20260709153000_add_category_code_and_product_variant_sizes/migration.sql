-- Add optional short code on category to build product references like S/123123
ALTER TABLE "Category"
ADD COLUMN "code" TEXT;

CREATE UNIQUE INDEX "Category_code_key" ON "Category"("code");

-- Add normalized size and default dimensions on product variants
CREATE TYPE "ProductSize" AS ENUM ('PM', 'MM', 'GM');

ALTER TABLE "ProductVariant"
ADD COLUMN "size" "ProductSize" NOT NULL DEFAULT 'MM',
ADD COLUMN "defaultDimensions" TEXT;

CREATE INDEX "ProductVariant_productId_size_idx" ON "ProductVariant"("productId", "size");
