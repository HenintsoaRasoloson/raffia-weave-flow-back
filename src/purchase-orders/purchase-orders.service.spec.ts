import { BadRequestException, NotFoundException } from '@nestjs/common';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { PurchaseOrdersService } from './purchase-orders.service';

describe('PurchaseOrdersService', () => {
  it('computes totalHt when creating a purchase order', async () => {
    const prisma = {
      $transaction: jest.fn().mockImplementation(async (callback) => callback(prisma)),
      documentSequence: {
        upsert: jest.fn().mockResolvedValue({ nextValue: 2 }),
      },
      purchaseOrder: {
        create: jest.fn().mockResolvedValue({ id: 'po-1' }),
      },
    } as any;
    const service = new PurchaseOrdersService(prisma);

    const dto = {
      supplierId: 'sup-1',
      orderDate: '2026-01-01T00:00:00.000Z',
      items: [
        { description: 'Cotton', quantity: 2, unitPrice: 10 },
        { description: 'Dye', quantity: 3, unitPrice: 5 },
      ],
    };

    await service.create(dto as any);

    expect(prisma.purchaseOrder.create).toHaveBeenCalled();
    const createArg = prisma.purchaseOrder.create.mock.calls[0][0];
    expect(createArg.data.totalHt).toBe(35);
    expect(createArg.data.orderNumber).toBe('ACH/000001');
    expect(createArg.data.referenceLevel).toBe(1);
  });

  it('throws when marking received on missing purchase order', async () => {
    const prisma = {
      purchaseOrder: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    } as any;
    const service = new PurchaseOrdersService(prisma);

    await expect(service.markReceived('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws when marking received on cancelled purchase order', async () => {
    const prisma = {
      purchaseOrder: {
        findUnique: jest.fn().mockResolvedValue({ status: 'CANCELLED' }),
      },
    } as any;
    const service = new PurchaseOrdersService(prisma);

    await expect(service.markReceived('po-1')).rejects.toBeInstanceOf(BadRequestException);
  });
});
