import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { BuildGedObjectKeyInput } from './ged.types';

function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-');
}

@Injectable()
export class GedPathsService {
  buildObjectKey(input: BuildGedObjectKeyInput): string {
    const date = input.createdAt ?? new Date();
    const yyyy = String(date.getUTCFullYear());
    const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(date.getUTCDate()).padStart(2, '0');
    const version = input.version ?? 1;

    const entityType = normalize(input.entityType);
    const entityId = normalize(input.entityId);
    const documentType = normalize(input.documentType);
    const fileName = normalize(input.originalFileName);

    return [
      normalize(input.domain),
      entityType,
      entityId,
      documentType,
      `${yyyy}/${mm}/${dd}`,
      `v${version}`,
      `${randomUUID()}-${fileName}`,
    ].join('/');
  }
}
