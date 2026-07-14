/**
 * Jest-safe stand-in for `src/generated/prisma/client`.
 * Avoids loading the real client (import.meta + Prisma ESM runtime).
 */
export * from '../../src/generated/prisma/enums';
export * as $Enums from '../../src/generated/prisma/enums';

type SqlValue = string | number | boolean | null | SqlFragment;
type SqlFragment = { strings: TemplateStringsArray | string[]; values: SqlValue[] };

function createSql(
  strings: TemplateStringsArray | string[],
  ...values: SqlValue[]
): SqlFragment {
  return { strings: strings as TemplateStringsArray, values };
}

export const Prisma = {
  sql: Object.assign(createSql, {
    raw: (value: string) => value,
  }),
  raw: (value: string) => value,
  join: (values: SqlValue[], separator = ', ') => ({
    strings: [''],
    values,
    separator,
  }),
};

export class PrismaClient {
  async $connect(): Promise<void> {
    return undefined;
  }

  async $disconnect(): Promise<void> {
    return undefined;
  }
}
