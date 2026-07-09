-- Add sequential counter by category for automatic product reference generation
ALTER TABLE "Category"
ADD COLUMN "refNextSequence" INTEGER NOT NULL DEFAULT 1;
