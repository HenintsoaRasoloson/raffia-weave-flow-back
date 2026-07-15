-- CreateEnum
CREATE TYPE "ProductOwnership" AS ENUM ('COMPANY', 'CLIENT');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN "ownership" "ProductOwnership" NOT NULL DEFAULT 'COMPANY';
ALTER TABLE "Product" ADD COLUMN "ownerClientId" TEXT;

-- CreateIndex
CREATE INDEX "Product_ownership_ownerClientId_idx" ON "Product"("ownership", "ownerClientId");
CREATE INDEX "Product_ownerClientId_idx" ON "Product"("ownerClientId");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_ownerClientId_fkey" FOREIGN KEY ("ownerClientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
