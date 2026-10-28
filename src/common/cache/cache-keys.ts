/** Cache-aside keys (memory or Redis via REDIS_URL). */
export const CACHE_KEYS = {
  companySettings: 'company-settings:v1',
  dashboard: (days: number) => `dashboard:v3:${days}`,
  dashboardKpis: (days: number) => `dashboard:kpis:v3:${days}`,
  dashboardQueue: 'dashboard:queue:v1',
} as const;

/** TTL in milliseconds (cache-manager v7). */
export const CACHE_TTL_MS = {
  companySettings: 120_000,
  dashboard: 30_000,
} as const;
