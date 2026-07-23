import {
  matchesBudgetEntry,
  resolvePeriod,
  round2,
  sum,
  toNumber,
} from './financial-tracking.math';

describe('financial-tracking.math', () => {
  it('converts decimal-like values and rounds to 2 decimals', () => {
    expect(toNumber('12.345')).toBeCloseTo(12.345);
    expect(round2('12.345')).toBe(12.35);
    expect(sum([1, '2.5', { toString: () => '0.5' }])).toBe(4);
  });

  it('resolves a default 30-day period when dates are omitted', () => {
    const { from, to } = resolvePeriod();
    expect(to.getTime()).toBeGreaterThan(from.getTime());
    expect(to.getTime() - from.getTime()).toBeGreaterThanOrEqual(29 * 24 * 60 * 60 * 1000);
  });

  it('matches budget entries by direction, period and scopes', () => {
    const budget = {
      direction: 'EXPENSE',
      periodStart: new Date('2026-01-01'),
      periodEnd: new Date('2026-01-31'),
      ledgerCategoryId: 'cat-1',
      clientId: null,
      supplierId: null,
    };

    expect(
      matchesBudgetEntry(budget, {
        entryDate: new Date('2026-01-15'),
        entryType: 'EXPENSE',
        amount: 10,
        ledgerCategoryId: 'cat-1',
      }),
    ).toBe(true);

    expect(
      matchesBudgetEntry(budget, {
        entryDate: new Date('2026-01-15'),
        entryType: 'INCOME',
        amount: 10,
        ledgerCategoryId: 'cat-1',
      }),
    ).toBe(false);
  });
});
