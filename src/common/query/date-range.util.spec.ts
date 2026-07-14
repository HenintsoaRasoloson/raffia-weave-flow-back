import {
  buildDateRangeFilter,
  dateFieldWhere,
  optionalEquals,
} from './date-range.util';

describe('date-range.util', () => {
  it('returns undefined when both bounds are missing', () => {
    expect(buildDateRangeFilter()).toBeUndefined();
  });

  it('builds a partial or full date range', () => {
    expect(buildDateRangeFilter('2026-01-01T00:00:00.000Z')).toEqual({
      gte: new Date('2026-01-01T00:00:00.000Z'),
    });
    expect(buildDateRangeFilter(undefined, '2026-12-31T23:59:59.999Z')).toEqual({
      lte: new Date('2026-12-31T23:59:59.999Z'),
    });
    expect(
      buildDateRangeFilter(
        '2026-01-01T00:00:00.000Z',
        '2026-12-31T23:59:59.999Z',
      ),
    ).toEqual({
      gte: new Date('2026-01-01T00:00:00.000Z'),
      lte: new Date('2026-12-31T23:59:59.999Z'),
    });
  });

  it('wraps a date range under a field name', () => {
    expect(dateFieldWhere('createdAt', '2026-01-01T00:00:00.000Z')).toEqual({
      createdAt: { gte: new Date('2026-01-01T00:00:00.000Z') },
    });
    expect(dateFieldWhere('orderDate')).toEqual({});
  });

  it('builds optional id equality filters', () => {
    expect(optionalEquals('clientId', 'cli_1')).toEqual({ clientId: 'cli_1' });
    expect(optionalEquals('clientId')).toEqual({});
  });
});
