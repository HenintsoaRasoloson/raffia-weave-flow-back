export const DEFAULT_GED_BUCKET_RAW = process.env.MINIO_BUCKET_RAW ?? 'ged-raw';
export const DEFAULT_GED_BUCKET_RENDERED =
  process.env.MINIO_BUCKET_RENDERED ?? 'ged-rendered';
export const DEFAULT_GED_BUCKET_ARCHIVE =
  process.env.MINIO_BUCKET_ARCHIVE ?? 'ged-archive';

export const GED_ALLOWED_EXTENSIONS = [
  '.pdf',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
] as const;
