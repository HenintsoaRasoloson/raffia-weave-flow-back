-- CreateEnum
CREATE TYPE "ProductTechnicalElementCategory" AS ENUM (
  'CROCHET',
  'RAPHIA',
  'LEATHER',
  'ACCESSORY',
  'LINING',
  'HANDLE',
  'HARDWARE',
  'LABEL',
  'PACKAGING',
  'OTHER'
);

-- CreateTable
CREATE TABLE "ProductTechnicalSheet" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "title" TEXT,
    "workshopNotes" TEXT,
    "instructions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductTechnicalSheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductTechnicalSheetElement" (
    "id" TEXT NOT NULL,
    "technicalSheetId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT NOT NULL,
    "category" "ProductTechnicalElementCategory" NOT NULL DEFAULT 'OTHER',
    "componentType" TEXT,
    "material" TEXT,
    "color" TEXT,
    "dimensions" TEXT,
    "sizeLabel" TEXT,
    "quantity" DECIMAL(14,4),
    "unit" "MaterialUnit",
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductTechnicalSheetElement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductTechnicalSheet_productId_key" ON "ProductTechnicalSheet"("productId");

-- CreateIndex
CREATE INDEX "ProductTechnicalSheetElement_technicalSheetId_sequence_idx" ON "ProductTechnicalSheetElement"("technicalSheetId", "sequence");

-- AddForeignKey
ALTER TABLE "ProductTechnicalSheet" ADD CONSTRAINT "ProductTechnicalSheet_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductTechnicalSheetElement" ADD CONSTRAINT "ProductTechnicalSheetElement_technicalSheetId_fkey" FOREIGN KEY ("technicalSheetId") REFERENCES "ProductTechnicalSheet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
