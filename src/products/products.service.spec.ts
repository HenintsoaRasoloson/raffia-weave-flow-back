import type { AuditService } from '../common/audit.service';
import type { GedPathsService } from '../ged/ged-paths.service';
import type { MinioService } from '../ged/minio.service';
import type { PrismaService } from '../prisma/prisma.service';
import { ProductsService } from './products.service';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

describe('ProductsService audit', () => {
  it('logs price and stock changes on update', async () => {
    const existing = {
      id: 'prd-1',
      categoryId: 'cat-1',
      ref: 'CAB/000001',
      name: 'Cabas',
      description: null,
      basePrice: 25000,
      stockOnHand: 0,
      status: 'ACTIVE',
      ownership: 'COMPANY',
      ownerClientId: null,
    };
    const saved = { ...existing, basePrice: 28000, stockOnHand: 4 };
    const prisma = {
      $transaction: jest.fn(async (cb: (tx: unknown) => unknown) => {
        const tx = {
          product: {
            findUnique: jest.fn().mockResolvedValue(existing),
            update: jest.fn().mockResolvedValue(saved),
          },
          catalogShareProduct: { count: jest.fn() },
          category: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'cat-1',
              code: 'CAB',
              slug: 'cabas',
              name: 'Cabas',
              refSequenceLength: 6,
              refNextSequence: 2,
            }),
          },
        };
        return cb(tx);
      }),
    } as unknown as PrismaService;
    const audit = { log: jest.fn().mockResolvedValue(undefined) } as unknown as AuditService;

    const service = new ProductsService(
      prisma,
      { isEnabled: () => false } as unknown as MinioService,
      {} as GedPathsService,
      audit,
    );

    await service.update(
      'prd-1',
      { basePrice: 28000, stockOnHand: 4 },
      'user-1',
    );

    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'Product',
        entityId: 'prd-1',
        action: 'PRODUCT_UPDATED',
        userId: 'user-1',
        changes: expect.objectContaining({
          basePrice: { before: 25000, after: 28000 },
          stockOnHand: { before: 0, after: 4 },
        }),
      }),
    );
  });
});
