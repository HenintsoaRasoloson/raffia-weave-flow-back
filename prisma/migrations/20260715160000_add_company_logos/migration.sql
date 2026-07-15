-- CreateEnum
CREATE TYPE "CompanyLogoKind" AS ENUM ('PRIMARY', 'APP', 'INVOICE', 'EMAIL');

-- CreateTable
CREATE TABLE "CompanyLogo" (
    "id" TEXT NOT NULL,
    "companySettingId" TEXT NOT NULL,
    "kind" "CompanyLogoKind" NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "bucket" TEXT,
    "objectKey" TEXT,
    "storagePath" TEXT,
    "originalSize" INTEGER NOT NULL,
    "compressedSize" INTEGER NOT NULL,
    "compressionAlgo" "CompressionAlgo" NOT NULL DEFAULT 'GZIP',
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyLogo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompanyLogo_companySettingId_idx" ON "CompanyLogo"("companySettingId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyLogo_companySettingId_kind_key" ON "CompanyLogo"("companySettingId", "kind");

-- AddForeignKey
ALTER TABLE "CompanyLogo" ADD CONSTRAINT "CompanyLogo_companySettingId_fkey" FOREIGN KEY ("companySettingId") REFERENCES "CompanySetting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyLogo" ADD CONSTRAINT "CompanyLogo_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
