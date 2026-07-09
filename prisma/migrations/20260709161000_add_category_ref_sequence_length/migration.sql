-- Add configurable numeric suffix length for product references by category
ALTER TABLE "Category"
ADD COLUMN "refSequenceLength" INTEGER NOT NULL DEFAULT 6;
