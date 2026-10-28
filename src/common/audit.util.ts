export type AuditScalar = string | number | boolean | null;

export type AuditFieldChange = {
  before?: AuditScalar;
  after?: AuditScalar;
};

export type AuditFieldChanges = Record<string, AuditFieldChange>;

export function toAuditScalar(value: unknown): AuditScalar {
  if (value == null) return null;
  if (typeof value === 'boolean' || typeof value === 'string') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (value instanceof Date) return value.toISOString();
  const numeric = Number(value);
  if (Number.isFinite(numeric) && value !== true && value !== false) {
    const asString = String(value);
    if (asString !== '' && asString !== '[object Object]') {
      return numeric;
    }
  }
  return String(value);
}

export function buildFieldChanges(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): AuditFieldChanges | undefined {
  const changes: AuditFieldChanges = {};
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const key of keys) {
    const previous = toAuditScalar(before[key]);
    const next = toAuditScalar(after[key]);
    if (previous !== next) {
      changes[key] = { before: previous, after: next };
    }
  }
  return Object.keys(changes).length > 0 ? changes : undefined;
}
