export type DateRangeFilter = {
  gte?: Date;
  lte?: Date;
};

/** Build an optional Prisma date range from ISO query params. */
export function buildDateRangeFilter(
  dateFrom?: string,
  dateTo?: string,
): DateRangeFilter | undefined {
  if (!dateFrom && !dateTo) {
    return undefined;
  }

  return {
    ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
    ...(dateTo ? { lte: new Date(dateTo) } : {}),
  };
}

/** Apply a date range on a named field when present. */
export function dateFieldWhere<K extends string>(
  field: K,
  dateFrom?: string,
  dateTo?: string,
): Partial<Record<K, DateRangeFilter>> {
  const range = buildDateRangeFilter(dateFrom, dateTo);
  if (!range) {
    return {};
  }

  return { [field]: range } as Partial<Record<K, DateRangeFilter>>;
}

/** Optional exact id equality filter. */
export function optionalEquals<K extends string>(
  field: K,
  value?: string,
): Partial<Record<K, string>> {
  return value ? ({ [field]: value } as Partial<Record<K, string>>) : {};
}
