export function toNumber(value: unknown): number {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    return Number(value);
  }

  if (value && typeof value === 'object' && 'toString' in value) {
    return Number(value.toString());
  }

  return 0;
}

export function round2(value: unknown): number {
  return Math.round(toNumber(value) * 100) / 100;
}

export function sum(
  values: Array<number | { toString(): string } | null | undefined>,
): number {
  return values.reduce((total, value) => total + toNumber(value ?? 0), 0);
}

export function sumLedgerEntries(
  entries: Array<{ entryType: string; amount: unknown }>,
  entryType: 'INCOME' | 'EXPENSE',
): number {
  return entries
    .filter((entry) => entry.entryType === entryType)
    .reduce((total, entry) => total + toNumber(entry.amount), 0);
}

export function computeTrackedBalance(
  entries: Array<{ entryType: string; amount: unknown }>,
): number {
  return entries.reduce((balance, entry) => {
    const amount = toNumber(entry.amount);
    if (entry.entryType === 'INCOME') {
      return balance + amount;
    }
    if (entry.entryType === 'EXPENSE') {
      return balance - amount;
    }
    return balance;
  }, 0);
}

export function buildCostKey(productId: string, variantId: string | null): string {
  return `${productId}::${variantId ?? 'base'}`;
}

export function resolvePeriod(dateFrom?: string, dateTo?: string) {
  const to = dateTo ? new Date(dateTo) : new Date();
  const from = dateFrom
    ? new Date(dateFrom)
    : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);

  return { from, to };
}

export function matchesBudgetEntry(
  budget: {
    direction: string;
    periodStart: Date;
    periodEnd: Date;
    ledgerCategoryId?: string | null;
    clientId?: string | null;
    supplierId?: string | null;
  },
  entry: {
    entryDate: Date;
    entryType: string;
    amount: unknown;
    ledgerCategoryId?: string | null;
    clientId?: string | null;
    supplierId?: string | null;
  },
): boolean {
  const expectedEntryType = budget.direction === 'INCOME' ? 'INCOME' : 'EXPENSE';

  if (entry.entryType !== expectedEntryType) {
    return false;
  }
  if (entry.entryDate < budget.periodStart || entry.entryDate > budget.periodEnd) {
    return false;
  }
  if (budget.ledgerCategoryId && entry.ledgerCategoryId !== budget.ledgerCategoryId) {
    return false;
  }
  if (budget.clientId && entry.clientId !== budget.clientId) {
    return false;
  }
  if (budget.supplierId && entry.supplierId !== budget.supplierId) {
    return false;
  }

  return true;
}

export function buildCategoryBreakdown(
  entries: Array<{
    entryType: string;
    amount: unknown;
    ledgerCategoryId?: string | null;
    ledgerCategory?: { id: string; code: string; name: string } | null;
  }>,
) {
  const buckets = new Map<
    string,
    { id: string | null; code: string; name: string; entryType: string; amount: number }
  >();

  for (const entry of entries) {
    const key = entry.ledgerCategory?.id ?? `uncategorized:${entry.entryType}`;
    const bucket = buckets.get(key) ?? {
      id: entry.ledgerCategory?.id ?? null,
      code: entry.ledgerCategory?.code ?? 'UNCATEGORIZED',
      name: entry.ledgerCategory?.name ?? 'Non categorise',
      entryType: entry.entryType,
      amount: 0,
    };

    bucket.amount += toNumber(entry.amount);
    buckets.set(key, bucket);
  }

  return Array.from(buckets.values())
    .map((bucket) => ({ ...bucket, amount: round2(bucket.amount) }))
    .sort((a, b) => b.amount - a.amount);
}
