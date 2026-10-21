import { BadRequestException } from '@nestjs/common';
import type { DocumentReferenceService } from '../common/document-reference/document-reference.service';
import type { NotificationsService } from '../notifications/notifications.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { SalesOrdersService } from '../sales-orders/sales-orders.service';
import { DeliveriesService } from './deliveries.service';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

describe('DeliveriesService quality gate', () => {
  function buildService(prisma: PrismaService) {
    return new DeliveriesService(
      prisma,
      {
        notifyRoles: jest.fn().mockResolvedValue(undefined),
      } as unknown as NotificationsService,
      {} as DocumentReferenceService,
      {
        updateStatus: jest.fn().mockResolvedValue({}),
      } as unknown as SalesOrdersService,
    );
  }

  it('rejects markDelivered when a related OF is not quality-approved', async () => {
    const prisma = {
      delivery: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'd1',
          status: 'PLANNED',
          salesOrderId: 'so1',
          deliveryNumber: 'LIV/000001',
          clientId: 'c1',
          client: { name: 'Client' },
        }),
      },
      productionOrder: {
        findMany: jest.fn().mockResolvedValue([
          { orderNumber: 'OF/000001' },
        ]),
      },
    } as unknown as PrismaService;
    const service = buildService(prisma);

    await expect(service.markDelivered('d1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('marks delivered when there is no pending quality check', async () => {
    const prisma = {
      delivery: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'd1',
          status: 'PLANNED',
          salesOrderId: 'so1',
          deliveryNumber: 'LIV/000001',
          clientId: 'c1',
          client: { name: 'Client' },
        }),
        update: jest.fn().mockResolvedValue({
          id: 'd1',
          status: 'DELIVERED',
          salesOrderId: 'so1',
        }),
      },
      productionOrder: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    } as unknown as PrismaService;
    const service = buildService(prisma);

    await expect(service.markDelivered('d1')).resolves.toMatchObject({
      status: 'DELIVERED',
    });
  });
});
