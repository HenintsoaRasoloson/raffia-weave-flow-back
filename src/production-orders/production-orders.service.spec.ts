import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProductionStage, ProductionStatus } from '../generated/prisma/client';
import type { AuditService } from '../common/audit.service';
import type { DocumentReferenceService } from '../common/document-reference/document-reference.service';
import { lockComponentsForUpdate } from '../common/stock/stock-lock.util';
import type { NotificationsService } from '../notifications/notifications.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { SalesOrdersService } from '../sales-orders/sales-orders.service';
import { ProductionOrdersService } from './production-orders.service';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

jest.mock('../common/stock/stock-lock.util', () => ({
  lockComponentsForUpdate: jest.fn(),
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

describe('ProductionOrdersService consumeMaterials', () => {
  const lockMock = lockComponentsForUpdate as jest.MockedFunction<
    typeof lockComponentsForUpdate
  >;

  beforeEach(() => {
    lockMock.mockReset();
  });

  it('consumes BOM stock atomically and marks materialsConsumedAt', async () => {
    const updatedOrder = {
      id: 'of-1',
      status: ProductionStatus.IN_PROGRESS,
      materialsConsumedAt: new Date('2026-07-23T10:00:00.000Z'),
    };
    const tx = {
      productionOrder: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'of-1',
          quantity: 2,
          status: ProductionStatus.PLANNED,
          materialsConsumedAt: null,
          product: {
            bomItems: [{ componentId: 'comp-1', quantity: 3 }],
          },
        }),
        update: jest.fn().mockResolvedValue(updatedOrder),
      },
      component: {
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const prisma = {
      $transaction: jest.fn().mockImplementation(async (cb) => cb(tx)),
    } as unknown as PrismaService;
    const audit = { log: jest.fn() } as unknown as AuditService;

    lockMock.mockResolvedValue(
      new Map([
        [
          'comp-1',
          { id: 'comp-1', ref: 'C1', name: 'Raphia', stockQty: 10 },
        ],
      ]),
    );

    const service = new ProductionOrdersService(
      prisma,
      audit,
      {} as NotificationsService,
      createDocumentReferenceMock(),
      {} as SalesOrdersService,
    );

    const result = await service.consumeMaterials('of-1', 'user-1');

    expect(lockMock).toHaveBeenCalledWith(tx, ['comp-1']);
    expect(tx.component.update).toHaveBeenCalledWith({
      where: { id: 'comp-1' },
      data: { stockQty: { decrement: 6 } },
    });
    expect(tx.productionOrder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: ProductionStatus.IN_PROGRESS,
          materialsConsumedAt: expect.any(Date),
        }),
      }),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'PRODUCTION_MATERIALS_CONSUMED',
        entityId: 'of-1',
        userId: 'user-1',
      }),
    );
    expect(result).toEqual(updatedOrder);
  });

  it('rejects double consumption', async () => {
    const tx = {
      productionOrder: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'of-1',
          quantity: 1,
          status: ProductionStatus.IN_PROGRESS,
          materialsConsumedAt: new Date(),
          product: { bomItems: [{ componentId: 'comp-1', quantity: 1 }] },
        }),
      },
    };
    const prisma = {
      $transaction: jest.fn().mockImplementation(async (cb) => cb(tx)),
    } as unknown as PrismaService;

    const service = new ProductionOrdersService(
      prisma,
      { log: jest.fn() } as unknown as AuditService,
      {} as NotificationsService,
      createDocumentReferenceMock(),
      {} as SalesOrdersService,
    );

    await expect(service.consumeMaterials('of-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(lockMock).not.toHaveBeenCalled();
  });

  it('rejects when stock is insufficient', async () => {
    const tx = {
      productionOrder: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'of-1',
          quantity: 5,
          status: ProductionStatus.PLANNED,
          materialsConsumedAt: null,
          product: { bomItems: [{ componentId: 'comp-1', quantity: 2 }] },
        }),
      },
      component: { update: jest.fn() },
    };
    const prisma = {
      $transaction: jest.fn().mockImplementation(async (cb) => cb(tx)),
    } as unknown as PrismaService;

    lockMock.mockResolvedValue(
      new Map([
        [
          'comp-1',
          { id: 'comp-1', ref: 'C1', name: 'Raphia', stockQty: 3 },
        ],
      ]),
    );

    const service = new ProductionOrdersService(
      prisma,
      { log: jest.fn() } as unknown as AuditService,
      {} as NotificationsService,
      createDocumentReferenceMock(),
      {} as SalesOrdersService,
    );

    await expect(service.consumeMaterials('of-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(tx.component.update).not.toHaveBeenCalled();
  });
});
