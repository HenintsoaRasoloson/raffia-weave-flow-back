import { InvoiceStatus, InvoiceType } from '../generated/prisma/client';
import type { AuditService } from '../common/audit.service';
import type { DocumentReferenceService } from '../common/document-reference/document-reference.service';
import type { NotificationsService } from '../notifications/notifications.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { SalesOrdersService } from '../sales-orders/sales-orders.service';
import type { InvoiceDocumentsService } from './invoice-documents.service';
import type { InvoicePaymentsService } from './invoice-payments.service';
import { InvoicesService } from './invoices.service';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

describe('InvoicesService sales-order invoicing', () => {
  function buildService(
    prisma: PrismaService,
    salesOrdersService: SalesOrdersService,
  ) {
    return new InvoicesService(
      prisma,
      { log: jest.fn() } as unknown as AuditService,
      {
        notifyRole: jest.fn().mockResolvedValue(undefined),
      } as unknown as NotificationsService,
      {
        allocateNextReferenceLevel: jest.fn().mockResolvedValue(1),
        parseReferenceNumber: jest.fn(),
      } as unknown as DocumentReferenceService,
      {} as InvoiceDocumentsService,
      {} as InvoicePaymentsService,
      salesOrdersService,
    );
  }

  it('marks the linked sales order INVOICED when creating a FINAL invoice', async () => {
    const updateStatus = jest.fn().mockResolvedValue({});
    const prisma = {
      $transaction: jest.fn().mockImplementation(async (cb: (tx: unknown) => unknown) =>
        cb({
          salesOrder: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'so1',
              referenceLevel: 1,
            }),
          },
          invoice: {
            create: jest.fn().mockResolvedValue({
              id: 'inv1',
              invoiceNumber: 'FAC/000001',
              type: InvoiceType.FINAL,
              status: InvoiceStatus.ISSUED,
              salesOrderId: 'so1',
              client: { name: 'Client' },
            }),
          },
        }),
      ),
    } as unknown as PrismaService;

    const service = buildService(prisma, {
      updateStatus,
    } as unknown as SalesOrdersService);

    await service.create(
      {
        type: 'FINAL',
        clientId: 'c1',
        salesOrderId: 'so1',
        issueDate: '2026-04-01T00:00:00.000Z',
        items: [{ description: 'Cabas', quantity: 1, unitPriceHt: 100 }],
      },
      'user-1',
    );

    expect(updateStatus).toHaveBeenCalledWith('so1', { status: 'INVOICED' });
  });

  it('does not mark the sales order INVOICED for a PROFORMA', async () => {
    const updateStatus = jest.fn().mockResolvedValue({});
    const prisma = {
      $transaction: jest.fn().mockImplementation(async (cb: (tx: unknown) => unknown) =>
        cb({
          salesOrder: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'so1',
              referenceLevel: 1,
            }),
          },
          invoice: {
            create: jest.fn().mockResolvedValue({
              id: 'inv1',
              invoiceNumber: 'PRO/000001',
              type: InvoiceType.PROFORMA,
              status: InvoiceStatus.ISSUED,
              salesOrderId: 'so1',
              client: { name: 'Client' },
            }),
          },
        }),
      ),
    } as unknown as PrismaService;

    const service = buildService(prisma, {
      updateStatus,
    } as unknown as SalesOrdersService);

    await service.create({
      type: 'PROFORMA',
      clientId: 'c1',
      salesOrderId: 'so1',
      issueDate: '2026-04-01T00:00:00.000Z',
      items: [{ description: 'Cabas', quantity: 1, unitPriceHt: 100 }],
    });

    expect(updateStatus).not.toHaveBeenCalled();
  });
});
