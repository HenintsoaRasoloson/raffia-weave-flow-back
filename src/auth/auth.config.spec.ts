import { getAuthConfig } from './auth.config';

describe('getAuthConfig', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
  });

  it('allows development defaults when secrets are missing', () => {
    const config = getAuthConfig({ NODE_ENV: 'development' });

    expect(config.accessTokenSecret).toBe('dev-auth-access-secret');
    expect(config.refreshTokenSecret).toBe('dev-auth-refresh-secret');
  });

  it('fails fast in production when secrets are missing', () => {
    expect(() => getAuthConfig({ NODE_ENV: 'production' })).toThrow(
      /Missing AUTH_JWT_ACCESS_SECRET or AUTH_JWT_REFRESH_SECRET/,
    );
  });

  it('rejects development default secrets in production', () => {
    expect(() =>
      getAuthConfig({
        NODE_ENV: 'production',
        AUTH_JWT_ACCESS_SECRET: 'dev-auth-access-secret',
        AUTH_JWT_REFRESH_SECRET: 'secure-refresh-secret',
      }),
    ).toThrow(/must not use development defaults/);
  });

  it('uses provided secrets in production', () => {
    const config = getAuthConfig({
      NODE_ENV: 'production',
      AUTH_JWT_ACCESS_SECRET: 'prod-access-secret',
      AUTH_JWT_REFRESH_SECRET: 'prod-refresh-secret',
    });

    expect(config.accessTokenSecret).toBe('prod-access-secret');
    expect(config.refreshTokenSecret).toBe('prod-refresh-secret');
  });
});
