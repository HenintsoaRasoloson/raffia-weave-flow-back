export type GedDomain =
  | 'sales'
  | 'purchases'
  | 'production'
  | 'deliveries'
  | 'finance'
  | 'admin';

export interface BuildGedObjectKeyInput {
  domain: GedDomain;
  entityType: string;
  entityId: string;
  documentType: string;
  originalFileName: string;
  createdAt?: Date;
  version?: number;
}
