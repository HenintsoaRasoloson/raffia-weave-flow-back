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
{domain}/{entityType}/{entityId}/{documentType}/{yyyy}/{mm}/{dd}/v{version}/{uuid}-{filename}
```

Exemple facture signee:

```text
finance/invoice/inv_01j123/signed_invoice/2026/07/09/v1/550e8400-e29b-41d4-a716-446655440000-facture-fac-2026-0421-signee.pdf
```

Exemple BAT signe:

```text
sales/sales-order/so_01j777/bat_signed/2026/07/09/v1/0f9a3ad3-7e2a-4f50-8edf-17bcfcd11abc-bat-client.pdf
```

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
