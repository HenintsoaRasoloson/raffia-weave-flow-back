import { resolveOrderBy, resolveSortDirection } from './sort.util';

describe('sort.util', () => {
  it('resolves sort direction with configurable default', () => {
    expect(resolveSortDirection('asc')).toBe('asc');
    expect(resolveSortDirection('desc')).toBe('desc');
    expect(resolveSortDirection(undefined)).toBe('desc');
    expect(resolveSortDirection(undefined, 'asc')).toBe('asc');
  });

  it('whitelists sortBy and falls back to default', () => {
    const allowed = ['createdAt', 'name'] as const;
    expect(
      resolveOrderBy({ sortBy: 'name', sortOrder: 'asc' }, allowed, 'createdAt'),
    ).toEqual({ name: 'asc' });
    expect(
      resolveOrderBy({ sortBy: 'unknown' }, allowed, 'createdAt'),
    ).toEqual({ createdAt: 'desc' });
    expect(resolveOrderBy({}, allowed, 'name', 'asc')).toEqual({ name: 'asc' });
  });
});
