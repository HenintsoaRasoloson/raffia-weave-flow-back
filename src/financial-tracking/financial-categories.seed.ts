import type { PrismaService } from '../prisma/prisma.service';

export const DEFAULT_LEDGER_CATEGORIES = [
  {
    code: 'CLIENT_COLLECTION',
    name: 'Encaissement client',
    entryType: 'INCOME',
    description: 'Encaissements reels des factures clients',
  },
  {
    code: 'SUPPLIER_PAYMENT',
    name: 'Paiement fournisseur',
    entryType: 'EXPENSE',
    description: 'Decaissements reels lies aux achats fournisseurs',
  },
  {
    code: 'PAYROLL',
    name: 'Salaires',
    entryType: 'EXPENSE',
    description: 'Salaires, primes et charges de personnel',
  },
  {
    code: 'LOGISTICS',
    name: 'Logistique',
    entryType: 'EXPENSE',
    description: 'Transport, livraison, emballage et manutention',
  },
  {
    code: 'TAX',
    name: 'Fiscalite',
    entryType: 'EXPENSE',
    description: 'TVA, impots et echeances fiscales',
  },
  {
    code: 'OPERATING_EXPENSE',
    name: 'Charges operationnelles',
    entryType: 'EXPENSE',
    description: 'Charges generales et depenses d exploitation',
  },
  {
    code: 'INTERNAL_TRANSFER',
    name: 'Virement interne',
    entryType: 'TRANSFER',
    description: 'Mouvements internes non retenus en resultat',
  },
] as const;

export async function ensureDefaultLedgerCategories(
  prisma: PrismaService,
): Promise<void> {
  const existingCount = await prisma.ledgerCategory.count();
  if (existingCount >= DEFAULT_LEDGER_CATEGORIES.length) {
    return;
  }

  await prisma.ledgerCategory.createMany({
    data: DEFAULT_LEDGER_CATEGORIES.map((category) => ({
      ...category,
      isSystem: true,
      active: true,
    })),
    skipDuplicates: true,
  });
}
