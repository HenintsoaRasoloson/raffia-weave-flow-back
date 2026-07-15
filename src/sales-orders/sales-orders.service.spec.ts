import { BadRequestException } from '@nestjs/common';
import type { AuditService } from '../common/audit.service';
import type { DocumentReferenceService } from '../common/document-reference/document-reference.service';
import type { GedPathsService } from '../ged/ged-paths.service';
import type { MinioService } from '../ged/minio.service';
import type { NotificationsService } from '../notifications/notifications.service';
import type { ProductsService } from '../products/products.service';
import type { PrismaService } from '../prisma/prisma.service';
import { SalesOrdersService } from './sales-orders.service';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

describe('SalesOrdersService price resolution', () => {
  function buildService(prisma: PrismaService, productsService?: ProductsService) {
    return new SalesOrdersService(
      prisma,
      { log: jest.fn() } as unknown as AuditService,
      { notifyRoles: jest.fn().mockResolvedValue(undefined) } as unknown as NotificationsService,
      { isEnabled: () => false } as unknown as MinioService,
      {} as GedPathsService,
      {
        allocateNextReferenceLevel: jest.fn().mockResolvedValue(1),
        buildReferenceNumber: jest.fn().mockReturnValue('CMD/000001'),
        parseReferenceNumber: jest.fn(),
      } as unknown as DocumentReferenceService,
      productsService ??
        ({
          createInTransaction: jest.fn(),
        } as unknown as ProductsService),
    );
  }

  it('uses catalog price for B2C when unitPriceHt omitted', async () => {
    const salesOrderCreate = jest.fn().mockResolvedValue({
      id: 'so1',
      orderNumber: 'CMD/000001',
      totalTtc: 200,
      client: { name: 'Alice' },
    });
    const prisma = {
      client: {
        findUnique: jest.fn().mockResolvedValue({ id: 'c1', type: 'B2C' }),
      },
      product: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'p1',
          ownership: 'COMPANY',
          ownerClientId: null,
          ref: 'CAB/000001',
        }),
      },
      productVariant: {
        findUnique: jest.fn().mockResolvedValue({
          priceOverride: 100,
          productId: 'p1',
          product: { basePrice: 89 },
        }),
      },
      $transaction: jest.fn().mockImplementation(async (cb) =>
        cb({
          product: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'p1',
              ownership: 'COMPANY',
              ownerClientId: null,
              ref: 'CAB/000001',
            }),
          },
          productVariant: {
            findUnique: jest.fn().mockResolvedValue({
              priceOverride: 100,
              productId: 'p1',
              product: { basePrice: 89 },
            }),
          },
          salesOrder: {
            create: salesOrderCreate,
          },
        }),
      ),
    } as unknown as PrismaService;

    const service = buildService(prisma);
    await service.create({
      clientId: 'c1',
      orderDate: '2026-07-14T00:00:00.000Z',
      items: [
        {
          description: 'Cabas',
          quantity: 2,
          productId: 'p1',
          variantId: 'v1',
        },
      ],
    });

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(salesOrderCreate).toHaveBeenCalled();
  });

  it('requires manual price for B2B without agreement', async () => {
    const prisma = {
      client: {
        findUnique: jest.fn().mockResolvedValue({ id: 'c1', type: 'B2B' }),
      },
      $transaction: jest.fn().mockImplementation(async (cb) =>
        cb({
          product: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'p1',
              ownership: 'COMPANY',
              ownerClientId: null,
              ref: 'CAB/000001',
            }),
          },
          clientVariantPrice: {
            findUnique: jest.fn().mockResolvedValue(null),
          },
        }),
      ),
    } as unknown as PrismaService;

    const service = buildService(prisma);

    await expect(
      service.create({
        clientId: 'c1',
        orderDate: '2026-07-14T00:00:00.000Z',
        items: [
          {
            description: 'Cabas',
            quantity: 1,
            productId: 'p1',
            variantId: 'v1',
          },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects orderType mismatch with client type', async () => {
    const prisma = {
      client: {
        findUnique: jest.fn().mockResolvedValue({ id: 'c1', type: 'B2C' }),
      },
    } as unknown as PrismaService;

    const service = buildService(prisma);

    await expect(
      service.create({
        clientId: 'c1',
        orderType: 'B2B',
        orderDate: '2026-07-14T00:00:00.000Z',
        items: [],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects linking another client model on the order', async () => {
    const prisma = {
      client: {
        findUnique: jest.fn().mockResolvedValue({ id: 'c1', type: 'B2C' }),
      },
      $transaction: jest.fn().mockImplementation(async (cb) =>
        cb({
          product: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'p1',
              ownership: 'CLIENT',
              ownerClientId: 'other-client',
              ref: 'CAB/000099',
            }),
          },
        }),
      ),
    } as unknown as PrismaService;

    const service = buildService(prisma);

    await expect(
      service.create({
        clientId: 'c1',
        orderDate: '2026-07-14T00:00:00.000Z',
        items: [
          {
            description: 'Modele autre client',
            quantity: 1,
            productId: 'p1',
            unitPriceHt: 50,
          },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates a client-owned model via newProduct on order line', async () => {
    const createInTransaction = jest.fn().mockResolvedValue({
      id: 'new-p1',
      variants: [{ id: 'new-v1' }],
    });
    const salesOrderCreate = jest.fn().mockResolvedValue({
      id: 'so1',
      orderNumber: 'CMD/000001',
      totalTtc: 100,
      client: { name: 'Alice' },
    });

    const prisma = {
      client: {
        findUnique: jest.fn().mockResolvedValue({ id: 'c1', type: 'B2C' }),
      },
      $transaction: jest.fn().mockImplementation(async (cb) =>
        cb({
          product: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'new-p1',
              ownership: 'CLIENT',
              ownerClientId: 'c1',
              ref: 'CAB/000010',
            }),
          },
          salesOrder: { create: salesOrderCreate },
        }),
      ),
    } as unknown as PrismaService;

    const service = buildService(prisma, {
      createInTransaction,
    } as unknown as ProductsService);

    await service.create({
      clientId: 'c1',
      orderDate: '2026-07-14T00:00:00.000Z',
      items: [
        {
          description: 'Nouveau modele client',
          quantity: 1,
          unitPriceHt: 100,
          newProduct: {
            name: 'Modele exclusif',
            categoryId: 'cat1',
            basePrice: 100,
          },
        },
      ],
    });

    expect(createInTransaction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        ownership: 'CLIENT',
        ownerClientId: 'c1',
        name: 'Modele exclusif',
      }),
    );
    expect(salesOrderCreate).toHaveBeenCalled();
  });
});
