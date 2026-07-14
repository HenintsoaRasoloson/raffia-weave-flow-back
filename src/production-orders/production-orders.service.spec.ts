import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProductionStage, ProductionStatus } from '../generated/prisma/client';
import type { AuditService } from '../common/audit.service';
import type { DocumentReferenceService } from '../common/document-reference/document-reference.service';
import type { NotificationsService } from '../notifications/notifications.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { SalesOrdersService } from '../sales-orders/sales-orders.service';
import { ProductionOrdersService } from './production-orders.service';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

function createDocumentReferenceMock(): DocumentReferenceService {
  return {
    allocateNextReferenceLevel: jest.fn().mockResolvedValue(1),
    buildReferenceNumber: jest.fn(
      (prefix: string, level: number) =>
        `${prefix}/${level.toString().padStart(6, '0')}`,
    ),
    parseReferenceNumber: jest.fn(),
  } as unknown as DocumentReferenceService;
}

describe('ProductionOrdersService planning', () => {
  it('aggregates workshop load by stage and day', async () => {
    const prisma = {
      productionStep: {
        findMany: jest.fn().mockResolvedValue([
          {
            stage: ProductionStage.PREPARATION,
            plannedStart: new Date(2026, 6, 2, 0, 0, 0, 0),
            plannedEnd: new Date(2026, 6, 4, 23, 59, 59, 999),
          },
          {
            stage: ProductionStage.CROCHET,
            plannedStart: new Date(2026, 6, 3, 0, 0, 0, 0),
            plannedEnd: new Date(2026, 6, 3, 23, 59, 59, 999),
          },
        ]),
      },
    } as unknown as PrismaService;

    const service = new ProductionOrdersService(
      prisma,
      {} as AuditService,
      {} as NotificationsService,
      createDocumentReferenceMock(),
      {} as SalesOrdersService,
    );

    const result = await service.getPlanning({
      from: '2026-07-01',
      to: '2026-07-05',
    });

    expect(result.from).toBe('2026-07-01');
    expect(result.to).toBe('2026-07-05');
    expect(result.days).toEqual([
      '2026-07-01',
      '2026-07-02',
      '2026-07-03',
      '2026-07-04',
      '2026-07-05',
    ]);

    const preparation = result.rows.find((row) => row.stage === 'PREPARATION');
    const crochet = result.rows.find((row) => row.stage === 'CROCHET');

    expect(preparation?.label).toBe('Préparation');
    expect(preparation?.load).toEqual([0, 1, 1, 1, 0]);
    expect(crochet?.load).toEqual([0, 0, 1, 0, 0]);
  });

  it('rejects inverted planning range', async () => {
    const service = new ProductionOrdersService(
      {} as PrismaService,
      {} as AuditService,
      {} as NotificationsService,
      createDocumentReferenceMock(),
      {} as SalesOrdersService,
    );

    await expect(
      service.getPlanning({ from: '2026-07-31', to: '2026-07-01' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates six default stages when creating an OF', async () => {
    const prisma = {
      $transaction: jest.fn().mockImplementation(async (callback) => callback(prisma)),
      productionOrder: {
        create: jest.fn().mockResolvedValue({
          id: 'po-1',
          orderNumber: 'OF/000001',
        }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          id: 'po-1',
          orderNumber: 'OF/000001',
          stages: [],
        }),
      },
      productionStep: {
        createMany: jest.fn().mockResolvedValue({ count: 6 }),
      },
    } as unknown as PrismaService;

    const salesOrders = {
      updateStatus: jest.fn().mockResolvedValue(undefined),
    } as unknown as SalesOrdersService;

    const audit = {
      log: jest.fn().mockResolvedValue(undefined),
    } as unknown as AuditService;

    const service = new ProductionOrdersService(
      prisma,
      audit,
      {} as NotificationsService,
      createDocumentReferenceMock(),
      salesOrders,
    );

    await service.create(
      {
        productId: 'prod-1',
        quantity: 10,
        startDate: '2026-07-01T00:00:00.000Z',
        endDate: '2026-07-07T00:00:00.000Z',
      },
      'user-1',
    );

    expect(prisma.productionOrder.create).toHaveBeenCalled();
    expect(prisma.productionStep.createMany).toHaveBeenCalled();
    const createManyArg = (prisma.productionStep.createMany as jest.Mock).mock
      .calls[0][0];
    expect(createManyArg.data).toHaveLength(6);
    expect(createManyArg.data[0].stage).toBe(ProductionStage.PREPARATION);
    expect(createManyArg.data[0].plannedStart).toBeInstanceOf(Date);
    expect(createManyArg.data[5].stage).toBe(ProductionStage.QUALITY_CONTROL);
  });

  it('throws when upserting stages on missing OF', async () => {
    const prisma = {
      productionOrder: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    } as unknown as PrismaService;

    const service = new ProductionOrdersService(
      prisma,
      {} as AuditService,
      {} as NotificationsService,
      createDocumentReferenceMock(),
      {} as SalesOrdersService,
    );

    await expect(
      service.upsertStages('missing', {
        stages: [{ stage: 'PREPARATION', plannedStart: '2026-07-01' }],
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('ignores cancelled orders via query filter', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = {
      productionStep: { findMany },
    } as unknown as PrismaService;

    const service = new ProductionOrdersService(
      prisma,
      {} as AuditService,
      {} as NotificationsService,
      createDocumentReferenceMock(),
      {} as SalesOrdersService,
    );

    await service.getPlanning({ from: '2026-07-01', to: '2026-07-02' });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          productionOrder: {
            status: { not: ProductionStatus.CANCELLED },
          },
        }),
      }),
    );
  });
});
