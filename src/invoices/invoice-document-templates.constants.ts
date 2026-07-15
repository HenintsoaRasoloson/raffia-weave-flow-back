import { InvoiceType } from '../generated/prisma/client';

export const INVOICE_DOCUMENT_LOCALE = 'fr' as const;

export const INVOICE_DOCUMENT_CONTENT_VERSION = 1 as const;

export const INVOICE_DOCUMENT_TEMPLATE_NAME_MAX_LENGTH = 120;

export const INVOICE_DOCUMENT_FREE_TEXT_MAX_LENGTH = 2000;

export const INVOICE_DOCUMENT_TYPES = Object.values(InvoiceType);

export type InvoiceDocumentTypeValue = (typeof INVOICE_DOCUMENT_TYPES)[number];

/** Placeholders autorisés dans les textes libres du template document. */
export const INVOICE_DOCUMENT_PLACEHOLDERS = [
  'companyName',
  'invoiceNumber',
  'clientName',
  'issueDate',
  'dueDate',
  'totalTtc',
  'currency',
] as const;

export type InvoiceDocumentPlaceholder =
  (typeof INVOICE_DOCUMENT_PLACEHOLDERS)[number];
