/** Cache-aside keys (in-memory CacheModule; Redis-ready later). */
export const CACHE_KEYS = {
  companySettings: 'company-settings:v1',
  dashboard: (days: number) => `dashboard:v1:${days}`,
  dashboardKpis: (days: number) => `dashboard:kpis:v1:${days}`,
} as const;

/** TTL in milliseconds (cache-manager v7). */
export const CACHE_TTL_MS = {
  companySettings: 120_000,
  dashboard: 30_000,
} as const;
