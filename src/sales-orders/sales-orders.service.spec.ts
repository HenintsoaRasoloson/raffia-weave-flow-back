import { BadRequestException } from '@nestjs/common';
import type { AuditService } from '../common/audit.service';
import type { DocumentReferenceService } from '../common/document-reference/document-reference.service';
import type { GedPathsService } from '../ged/ged-paths.service';
import type { MinioService } from '../ged/minio.service';
import type { NotificationsService } from '../notifications/notifications.service';
import type { PrismaService } from '../prisma/prisma.service';
import { SalesOrdersService } from './sales-orders.service';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

describe('SalesOrdersService price resolution', () => {
  function buildService(prisma: PrismaService) {
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
    );
  }

  it('uses catalog price for B2C when unitPriceHt omitted', async () => {
    const prisma = {
      client: {
        findUnique: jest.fn().mockResolvedValue({ id: 'c1', type: 'B2C' }),
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
          salesOrder: {
            create: jest.fn().mockResolvedValue({
              id: 'so1',
              orderNumber: 'CMD/000001',
              client: { name: 'Alice' },
            }),
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
  });

  it('requires manual price for B2B without agreement', async () => {
    const prisma = {
      client: {
        findUnique: jest.fn().mockResolvedValue({ id: 'c1', type: 'B2B' }),
      },
      clientVariantPrice: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
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
});
