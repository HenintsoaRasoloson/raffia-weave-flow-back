import { Prisma } from '../../generated/prisma/client';

export type LockedComponentRow = {
  id: string;
  ref: string;
  name: string;
  stockQty: Prisma.Decimal;
};

type TxWithRaw = {
  $queryRaw: (
    query: TemplateStringsArray,
    ...values: unknown[]
  ) => Promise<LockedComponentRow[]>;
};

/**
 * Lock component rows in stable id order to avoid deadlocks,
 * then return a map for stock checks / updates inside the same transaction.
 */
export async function lockComponentsForUpdate(
  tx: TxWithRaw,
  componentIds: string[],
): Promise<Map<string, LockedComponentRow>> {
  const uniqueIds = [...new Set(componentIds.filter(Boolean))].sort();
  if (uniqueIds.length === 0) {
    return new Map();
  }

  const rows = await tx.$queryRaw`
    SELECT id, ref, name, "stockQty"
    FROM "Component"
    WHERE id IN (${Prisma.join(uniqueIds)})
    FOR UPDATE
  `;

  return new Map(rows.map((row) => [row.id, row]));
}
