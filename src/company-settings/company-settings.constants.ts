export const DEFAULT_COMPANY_NAME = 'Atelier Raphia';

/** Kinds exposés en API (path param / JSON). */
export const COMPANY_LOGO_KINDS = [
  'primary',
  'app',
  'invoice',
  'email',
] as const;

export type CompanyLogoKindParam = (typeof COMPANY_LOGO_KINDS)[number];

/** documentType GED pour chaque slot (immutable naming). */
export const COMPANY_LOGO_GED_DOCUMENT_TYPE: Record<
  CompanyLogoKindParam,
  string
> = {
  primary: 'logo_primary',
  app: 'logo_app',
  invoice: 'logo_invoice',
  email: 'logo_email',
};

export const COMPANY_LOGO_ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
] as const;

export const COMPANY_LOGO_MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;
