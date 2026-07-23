export function parseCorsOrigins(
  raw: string = process.env.CORS_ORIGINS ?? '',
): string[] {
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function isCorsOriginAllowed(
  origin: string | undefined,
  allowedOrigins: string[] = parseCorsOrigins(),
): boolean {
  if (!origin) {
    return true;
  }

  return allowedOrigins.includes(origin);
}

export function corsOriginDelegate(
  origin: string | undefined,
  callback: (error: Error | null, allow?: boolean) => void,
): void {
  if (isCorsOriginAllowed(origin)) {
    callback(null, true);
    return;
  }

  callback(new Error(`Origin ${origin} not allowed by CORS`), false);
}
