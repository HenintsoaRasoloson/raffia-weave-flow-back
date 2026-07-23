export type AuthConfig = {
  accessTokenSecret: string;
  refreshTokenSecret: string;
  accessTokenTtl: string;
  refreshTokenTtl: string;
  maxFailedAttempts: number;
  lockMinutes: number;
};

const DEV_ACCESS_SECRET = 'dev-auth-access-secret';
const DEV_REFRESH_SECRET = 'dev-auth-refresh-secret';

function allowsDevSecretDefaults(nodeEnv: string): boolean {
  return nodeEnv === 'development' || nodeEnv === 'test';
}

export function getAuthConfig(
  env: NodeJS.ProcessEnv = process.env,
): AuthConfig {
  const nodeEnv = env.NODE_ENV ?? 'development';
  const accessTokenSecret = env.AUTH_JWT_ACCESS_SECRET;
  const refreshTokenSecret = env.AUTH_JWT_REFRESH_SECRET;

  if (!allowsDevSecretDefaults(nodeEnv)) {
    if (!accessTokenSecret || !refreshTokenSecret) {
      throw new Error(
        'Missing AUTH_JWT_ACCESS_SECRET or AUTH_JWT_REFRESH_SECRET environment variables.',
      );
    }

    if (
      accessTokenSecret === DEV_ACCESS_SECRET ||
      refreshTokenSecret === DEV_REFRESH_SECRET
    ) {
      throw new Error(
        'AUTH_JWT_ACCESS_SECRET and AUTH_JWT_REFRESH_SECRET must not use development defaults outside development/test.',
      );
    }
  }

  return {
    accessTokenSecret: accessTokenSecret ?? DEV_ACCESS_SECRET,
    refreshTokenSecret: refreshTokenSecret ?? DEV_REFRESH_SECRET,
    accessTokenTtl: env.AUTH_JWT_ACCESS_TTL ?? '15m',
    refreshTokenTtl: env.AUTH_JWT_REFRESH_TTL ?? '7d',
    maxFailedAttempts: Number(env.AUTH_MAX_FAILED_ATTEMPTS ?? 5),
    lockMinutes: Number(env.AUTH_LOCK_MINUTES ?? 15),
  };
}
