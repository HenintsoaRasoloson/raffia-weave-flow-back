import { gunzipSync, gzipSync } from 'zlib';

export function shouldCompressImage(mimeType: string): boolean {
  return (
    mimeType === 'image/png' ||
    mimeType === 'image/jpeg' ||
    mimeType === 'image/webp'
  );
}

export function compressBufferIfNeeded(
  source: Buffer,
  mimeType: string,
): { buffer: Buffer; algo: 'NONE' | 'GZIP' } {
  if (!shouldCompressImage(mimeType)) {
    return { buffer: source, algo: 'NONE' };
  }

  return { buffer: gzipSync(source), algo: 'GZIP' };
}

export function decompressBufferIfNeeded(
  source: Buffer,
  algo: string,
): Buffer {
  if (algo === 'GZIP') {
    return gunzipSync(source);
  }

  return source;
}
