-- Sociétés légales (plusieurs fiches, une seule par défaut pour les documents).
CREATE TABLE "CompanyProfile" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "nif" TEXT,
    "stat" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "addressLine" TEXT,
    "city" TEXT,
    "postalCode" TEXT,
    "country" TEXT,
    "iban" TEXT,
    "mobileMoney" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "logoOriginalName" TEXT,
    "logoMimeType" TEXT,
    "logoBucket" TEXT,
    "logoObjectKey" TEXT,
    "logoStoragePath" TEXT,
    "logoOriginalSize" INTEGER,
    "logoCompressedSize" INTEGER,
    "logoCompressionAlgo" "CompressionAlgo",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyProfile_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CompanyProfile_isDefault_idx" ON "CompanyProfile"("isDefault");

-- Reprend la société déjà saisie comme fiche par défaut (NIF ← siret, STAT ← vatNumber).
INSERT INTO "CompanyProfile" (
    "id",
    "companyName",
    "nif",
    "stat",
    "addressLine",
    "city",
    "postalCode",
    "country",
    "iban",
    "mobileMoney",
    "isDefault",
    "createdAt",
    "updatedAt"
)
SELECT
    "id",
    "companyName",
    "siret",
    "vatNumber",
    "addressLine",
    "city",
    "postalCode",
    "country",
    "iban",
    "mobileMoney",
    true,
    "createdAt",
    "updatedAt"
FROM "CompanySetting"
ORDER BY "createdAt" ASC
LIMIT 1;
