-- CreateEnum
CREATE TYPE "ComponentOrigin" AS ENUM ('PURCHASED', 'MANUFACTURED');

-- AlterTable
ALTER TABLE "Component" ADD COLUMN     "origin" "ComponentOrigin" NOT NULL DEFAULT 'PURCHASED';
