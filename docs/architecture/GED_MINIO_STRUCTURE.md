# GED + MinIO (Docker) - Structure recommandee

## Objectif

Mettre en place une GED centralisee sur MinIO (S3 compatible), avec une hierarchie de stockage stable, lisible et evolutive.

## Démarrage MinIO

1. Lancer MinIO + init buckets:

```bash
docker compose -f docker-compose.minio.yml up -d
```

2. Console MinIO:

- URL: http://localhost:9001
- user/password par defaut: `minioadmin` / `minioadmin`

## Buckets

- `ged-raw`: fichiers originaux (uploads utilisateur)
- `ged-rendered`: fichiers generes (PDF, exports)
- `ged-archive`: versions archivees / legale

## Hierarchie d'objets

Convention de cle S3:

```text
{domain}/{entityType}/{entityId}/{documentType}/{yyyy}/{mm}/{dd}/v{version}/{readable-name}-{stamp}-{suffix}.{ext}
```

Exemple facture signee:

```text
finance/invoice/inv_01j123/signed_invoice/2026/07/09/v1/invoice-inv_01j123-signed_invoice-facture-signee-20260709-101500-a1b2c3.pdf
```

Exemple BAT signe:

```text
sales/sales-order/so_01j777/bat_signed/2026/07/09/v1/sales-order-so_01j777-bat_signed-bat-client-20260709-101500-0f9a3a.pdf
```

Exemple logos societe (Company Settings):

```text
admin/company-setting/cst_01abc/logo_primary/2026/07/15/v1/company-setting-cst_01abc-logo_primary-logo-atelier-20260715-120000-d4e5f6.png
admin/company-setting/cst_01abc/logo_invoice/2026/07/15/v2/company-setting-cst_01abc-logo_invoice-logo-facture-20260715-130000-aabbcc.png
admin/company-setting/cst_01abc/logo_email/2026/07/15/v1/company-setting-cst_01abc-logo_email-logo-mail-20260715-140000-112233.png
admin/company-setting/cst_01abc/logo_app/2026/07/15/v1/company-setting-cst_01abc-logo_app-logo-app-20260715-150000-445566.webp
```

Document types logos:

| Kind API | `documentType` GED | Usage |
|----------|--------------------|--------|
| `primary` | `logo_primary` | Fallback pour tous les canaux |
| `app` | `logo_app` | Application (sidebar / login) |
| `invoice` | `logo_invoice` | Documents (factures, devis, BL…) |
| `email` | `logo_email` | Templates email |

Resolution runtime: override du slot → sinon `primary` → sinon aucun logo.
## Domaines conseilles

- `sales`
- `purchases`
- `production`
- `deliveries`
- `finance`
- `admin`

## Principes de conception GED

- Immutable par defaut: nouveau fichier => nouvelle version (`v2`, `v3`, ...)
- Nom logique en metadata DB, nom physique stable en cle S3
- Jamais de donnees metier critiques uniquement dans le chemin S3: garder une table SQL de metadata
- Telechargement via URL signee a duree courte
- Bucket `archive` reserve aux documents finalises (signature/cachet) et non mutables

## Cas d'usage couverts

- Produits: plusieurs images par produit (upload multi-fichiers)
- Factures: documents signes/cachetes
- BAT: documents BAT (preview, envoye client, signe approuve)
- Clients B2B: cartes fiscales avec date de validite
- Societe: logos d'identite visuelle (`CompanyLogo`, 1 fichier actif par kind, versions GED)
## Compression images

- Les images uploadées sont compressees en `gzip` avant stockage objet
- Les endpoints de lecture (notamment image produit) decompriment a la volee
- Objectif: reduire le volume stocke sans changer le rendu consomme par le front

## Variables d'environnement

Ajoutees dans `.env`:

- `MINIO_ENABLED`
- `MINIO_ENDPOINT`
- `MINIO_REGION`
- `MINIO_ACCESS_KEY`
- `MINIO_SECRET_KEY`
- `MINIO_BUCKET_RAW`
- `MINIO_BUCKET_RENDERED`
- `MINIO_BUCKET_ARCHIVE`
- `MINIO_FORCE_PATH_STYLE`

## Base NestJS preparee

Un module GED reutilisable est pret:

- `src/ged/ged.module.ts`
- `src/ged/minio.service.ts`
- `src/ged/ged-paths.service.ts`

Ce module n'impose pas encore de branchement metier. Il sert de fondation pour brancher ensuite les cas d'usage que tu definiras.
