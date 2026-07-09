import { Prisma } from '../../generated/prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';

const FRENCH_ACCENT_FROM =
  'àâäáãåéèêëíìîïóòôöõúùûüýÿçñÀÂÄÁÃÅÉÈÊËÍÌÎÏÓÒÔÖÕÚÙÛÜÝŸÇÑ';
const FRENCH_ACCENT_TO =
  'aaaaaaeeeeiiiiooooouuuuyycnAAAAAAEEEEIIIIOOOOOUUUUYYCN';

export type InsensitiveStringFilter = {
  contains: string;
  mode: 'insensitive';
};

export type InsensitiveEqualsFilter = {
  equals: string;
  mode: 'insensitive';
};

/** Trim and collapse internal whitespace for query params. */
export function trimQueryValue(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  const normalized = String(value).trim().replace(/\s+/g, ' ');
  return normalized.length > 0 ? normalized : undefined;
}

/** Escape SQL LIKE wildcards used by Prisma `contains` filters. */
export function escapeLikePattern(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

/** Prepare a user search term for safe, accent-aware lookups. */
export function prepareSearchTerm(value: unknown): string | undefined {
  const trimmed = trimQueryValue(value);
  return trimmed ? escapeLikePattern(trimmed) : undefined;
}

/** Fold French diacritics for enum / code normalization. */
export function foldDiacritics(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** Normalize enum-like query params (status, type, etc.). */
export function normalizeEnumParam(value: unknown): string | undefined {
  const trimmed = trimQueryValue(value);
  if (!trimmed) {
    return undefined;
  }

  return foldDiacritics(trimmed)
    .toUpperCase()
    .replace(/[\s-]+/g, '_')
    .replace(/[^A-Z0-9_]/g, '');
}

export function containsFilter(term: string): InsensitiveStringFilter {
  return {
    contains: term,
    mode: 'insensitive',
  };
}

export function equalsFilter(term: string): InsensitiveEqualsFilter {
  return {
    equals: term,
    mode: 'insensitive',
  };
}

export function buildContainsOr(
  fields: string[],
  term: string,
): Array<Record<string, InsensitiveStringFilter>> {
  return fields.map((field) => ({
    [field]: containsFilter(term),
  }));
}

function foldFrenchSql(columnSql: Prisma.Sql, pattern: string): Prisma.Sql {
  return Prisma.sql`translate(lower(${columnSql}), ${FRENCH_ACCENT_FROM}, ${FRENCH_ACCENT_TO}) LIKE translate(lower(${pattern}), ${FRENCH_ACCENT_FROM}, ${FRENCH_ACCENT_TO})`;
}

/**
 * Accent- and case-insensitive text search on one table.
 * Returns matching row ids; empty array means no match.
 */
export async function resolveFrenchTextSearchIds(
  prisma: PrismaService,
  table: string,
  columns: string[],
  term: string,
): Promise<string[]> {
  if (!term || columns.length === 0) {
    return [];
  }

  const pattern = `%${term}%`;
  const tableSql = Prisma.raw(`"${table}"`);
  const conditions = columns.map((column) =>
    foldFrenchSql(
      Prisma.raw(`"${table}"."${column}"`),
      pattern,
    ),
  );

  const rows = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
    SELECT id
    FROM ${tableSql}
    WHERE ${Prisma.join(conditions, ' OR ')}
  `);

  return rows.map((row) => row.id);
}

/** Build an OR filter for scalar fields + optional related tables. */
export async function buildFrenchTextSearchOr(
  prisma: PrismaService,
  input: {
    term?: string;
    scalarFields?: string[];
    relations?: Array<{
      table: string;
      columns: string[];
      foreignKey: string;
    }>;
  },
): Promise<Array<Record<string, unknown>> | undefined> {
  const term = prepareSearchTerm(input.term);
  if (!term) {
    return undefined;
  }

  const or: Array<Record<string, unknown>> = buildContainsOr(
    input.scalarFields ?? [],
    term,
  );

  for (const relation of input.relations ?? []) {
    const ids = await resolveFrenchTextSearchIds(
      prisma,
      relation.table,
      relation.columns,
      term,
    );

    if (ids.length > 0) {
      or.push({ [relation.foreignKey]: { in: ids } });
    }
  }

  if (or.length === 0) {
    return [{ id: { in: [] } }];
  }

  return or;
}

/** Apply accent-insensitive search on columns of a single table. */
export async function buildFrenchTableTextWhere(
  prisma: PrismaService,
  table: string,
  columns: string[],
  term?: string,
): Promise<{ id: { in: string[] } } | Record<string, never>> {
  const prepared = prepareSearchTerm(term);
  if (!prepared) {
    return {};
  }

  const ids = await resolveFrenchTextSearchIds(prisma, table, columns, prepared);
  return { id: { in: ids } };
}
