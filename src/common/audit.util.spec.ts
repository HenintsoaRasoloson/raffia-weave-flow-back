import { buildFieldChanges, toAuditScalar } from './audit.util';

describe('audit.util', () => {
  it('treats prisma decimals as numbers', () => {
    expect(toAuditScalar({ toString: () => '25000' })).toBe(25000);
    expect(toAuditScalar(null)).toBeNull();
  });

  it('returns only changed fields', () => {
    expect(
      buildFieldChanges(
        { stockOnHand: 0, status: 'ACTIVE', name: 'Cabas' },
        { stockOnHand: 3, status: 'ACTIVE', name: 'Cabas' },
      ),
    ).toEqual({
      stockOnHand: { before: 0, after: 3 },
    });
  });
});
