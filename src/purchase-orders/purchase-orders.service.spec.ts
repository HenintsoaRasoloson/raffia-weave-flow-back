import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { DocumentReferenceService } from '../common/document-reference/document-reference.service';
import type { PrismaService } from '../prisma/prisma.service';
import { PurchaseOrdersService } from './purchase-orders.service';

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

describe('PurchaseOrdersService', () => {
  it('computes totalHt when creating a purchase order', async () => {
    const prisma = {
      $transaction: jest.fn().mockImplementation(async (callback) => callback(prisma)),
      purchaseOrder: {
        create: jest.fn().mockResolvedValue({ id: 'po-1' }),
      },
    } as unknown as PrismaService;
    const documentReference = createDocumentReferenceMock();
    const service = new PurchaseOrdersService(prisma, documentReference);

    const dto = {
      supplierId: 'sup-1',
      orderDate: '2026-01-01T00:00:00.000Z',
      items: [
        { description: 'Cotton', quantity: 2, unitPrice: 10 },
        { description: 'Dye', quantity: 3, unitPrice: 5 },
      ],
    };

    await service.create(dto);

    expect(prisma.purchaseOrder.create).toHaveBeenCalled();
    const createArg = (prisma.purchaseOrder.create as jest.Mock).mock.calls[0][0];
    expect(createArg.data.totalHt).toBe(35);
    expect(createArg.data.orderNumber).toBe('ACH/000001');
    expect(createArg.data.referenceLevel).toBe(1);
  });

  it('throws when marking received on missing purchase order', async () => {
    const prisma = {
      $transaction: jest.fn().mockImplementation(async (callback) => callback(prisma)),
      purchaseOrder: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    } as unknown as PrismaService;
    const service = new PurchaseOrdersService(
      prisma,
      createDocumentReferenceMock(),
    );

    await expect(service.markReceived('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('throws when marking received on cancelled purchase order', async () => {
    const prisma = {
      $transaction: jest.fn().mockImplementation(async (callback) => callback(prisma)),
      purchaseOrder: {
        findUnique: jest.fn().mockResolvedValue({ status: 'CANCELLED' }),
      },
    } as unknown as PrismaService;
    const service = new PurchaseOrdersService(
      prisma,
      createDocumentReferenceMock(),
    );

    await expect(service.markReceived('po-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('receives a purchase order and increments component stock atomically', async () => {
    const prisma = {
      $transaction: jest.fn().mockImplementation(async (callback) => callback(prisma)),
      purchaseOrder: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'po-1',
          status: 'CONFIRMED',
          items: [
            { componentId: 'comp-1', quantity: 4 },
            { componentId: null, quantity: 1 },
          ],
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'po-1', status: 'RECEIVED' }),
      },
      component: {
        update: jest.fn().mockResolvedValue({ id: 'comp-1' }),
      },
    } as unknown as PrismaService;
    const service = new PurchaseOrdersService(
      prisma,
      createDocumentReferenceMock(),
    );

    await expect(service.markReceived('po-1')).resolves.toEqual({
      id: 'po-1',
      status: 'RECEIVED',
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.purchaseOrder.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'po-1',
        status: { notIn: ['RECEIVED', 'CANCELLED'] },
      },
      data: {
        status: 'RECEIVED',
        receivedAt: expect.any(Date),
      },
    });
    expect(prisma.component.update).toHaveBeenCalledTimes(1);
    expect(prisma.component.update).toHaveBeenCalledWith({
      where: { id: 'comp-1' },
      data: { stockQty: { increment: 4 } },
    });
  });

  it('rolls back when component stock update fails during receive', async () => {
    const prisma = {
      $transaction: jest.fn().mockImplementation(async (callback) => callback(prisma)),
      purchaseOrder: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'po-1',
          status: 'CONFIRMED',
          items: [{ componentId: 'missing-comp', quantity: 2 }],
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      component: {
        update: jest.fn().mockRejectedValue(new Error('Component missing')),
      },
    } as unknown as PrismaService;
    const service = new PurchaseOrdersService(
      prisma,
      createDocumentReferenceMock(),
    );

    await expect(service.markReceived('po-1')).rejects.toThrow('Component missing');
  });
});