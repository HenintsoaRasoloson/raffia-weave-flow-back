import type { ListQueryDto } from '../dto/list-query.dto';

const SORT_ORDER_ASC = 'asc' as const;
const SORT_ORDER_DESC = 'desc' as const;

export type SortDirection = typeof SORT_ORDER_ASC | typeof SORT_ORDER_DESC;

/** Resolve asc/desc from query; falls back to the provided default. */
export function resolveSortDirection(
  sortOrder?: ListQueryDto['sortOrder'],
  defaultDirection: SortDirection = SORT_ORDER_DESC,
): SortDirection {
  if (sortOrder === SORT_ORDER_ASC) {
    return SORT_ORDER_ASC;
  }
  if (sortOrder === SORT_ORDER_DESC) {
    return SORT_ORDER_DESC;
  }
  return defaultDirection;
}

/**
 * Build a Prisma orderBy object from a whitelist.
 * Falls back to defaultField when sortBy is missing or not allowed.
 */
export function resolveOrderBy<T extends string>(
  query: Pick<ListQueryDto, 'sortBy' | 'sortOrder'>,
  allowedFields: readonly T[],
  defaultField: T,
  defaultDirection: SortDirection = SORT_ORDER_DESC,
): Record<T, SortDirection> {
  const field =
    query.sortBy && (allowedFields as readonly string[]).includes(query.sortBy)
      ? (query.sortBy as T)
      : defaultField;

  return {
    [field]: resolveSortDirection(query.sortOrder, defaultDirection),
  } as Record<T, SortDirection>;
}
