import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { BuildGedObjectKeyInput } from './ged.types';

function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-');
}

function splitNameAndExt(fileName: string): { base: string; ext: string } {
  const lastDot = fileName.lastIndexOf('.');
  if (lastDot <= 0 || lastDot === fileName.length - 1) {
    return { base: fileName, ext: '' };
  }

  return {
    base: fileName.slice(0, lastDot),
    ext: fileName.slice(lastDot + 1),
  };
}

function toUtcStamp(date: Date): string {
  const yyyy = String(date.getUTCFullYear());
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const mi = String(date.getUTCMinutes()).padStart(2, '0');
  const ss = String(date.getUTCSeconds()).padStart(2, '0');
  return `${yyyy}${mm}${dd}-${hh}${mi}${ss}`;
}

function shortSuffix(): string {
  return randomBytes(3).toString('hex');
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
    const normalizedOriginal = normalize(input.originalFileName);
    const { base, ext } = splitNameAndExt(normalizedOriginal);

    // Keep object names readable in MinIO while guaranteeing uniqueness.
    const readableBase = [entityType, entityId, documentType, base]
      .filter(Boolean)
      .join('-')
      .slice(0, 120)
      .replace(/-+/g, '-');
    const uniqueReadableName = `${readableBase}-${toUtcStamp(date)}-${shortSuffix()}${ext ? `.${ext}` : ''}`;

    return [
      normalize(input.domain),
      entityType,
      entityId,
      documentType,
      `${yyyy}/${mm}/${dd}`,
      `v${version}`,
      uniqueReadableName,
    ].join('/');
  }
}
