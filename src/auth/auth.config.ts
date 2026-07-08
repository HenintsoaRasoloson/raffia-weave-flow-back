export function getAuthConfig() {
  return {
    accessTokenSecret:
      process.env.AUTH_JWT_ACCESS_SECRET ?? 'dev-auth-access-secret',
    refreshTokenSecret:
      process.env.AUTH_JWT_REFRESH_SECRET ?? 'dev-auth-refresh-secret',
    accessTokenTtl: process.env.AUTH_JWT_ACCESS_TTL ?? '15m',
    refreshTokenTtl: process.env.AUTH_JWT_REFRESH_TTL ?? '7d',
    maxFailedAttempts: Number(process.env.AUTH_MAX_FAILED_ATTEMPTS ?? 5),
    lockMinutes: Number(process.env.AUTH_LOCK_MINUTES ?? 15),
  };
}