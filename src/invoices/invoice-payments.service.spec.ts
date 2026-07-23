import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InvoiceStatus, InvoiceType } from '../generated/prisma/client';
import type { AuditService } from '../common/audit.service';
import type { NotificationsService } from '../notifications/notifications.service';
import type { PrismaService } from '../prisma/prisma.service';
import { InvoicePaymentsService } from './invoice-payments.service';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

describe('InvoicePaymentsService', () => {
  it('rejects marking a draft invoice as paid', async () => {
    const prisma = {
      invoice: {
        findUnique: jest.fn().mockResolvedValue({
          status: InvoiceStatus.DRAFT,
          type: InvoiceType.FINAL,
          totalTtc: 100,
        }),
      },
    } as unknown as PrismaService;

    const service = new InvoicePaymentsService(
      prisma,
      { log: jest.fn() } as unknown as AuditService,
      { notifyRole: jest.fn(), notifyRoles: jest.fn() } as unknown as NotificationsService,
    );

    await expect(service.markPaid('inv-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('records a partial payment and creates a ledger entry', async () => {
    const tx = {
      invoicePayment: { create: jest.fn().mockResolvedValue({}) },
      ledgerCategory: {
        upsert: jest.fn().mockResolvedValue({ id: 'cat-1' }),
      },
      ledgerEntry: { create: jest.fn().mockResolvedValue({}) },
      invoice: {
        update: jest.fn().mockResolvedValue({
          id: 'inv-1',
          invoiceNumber: 'FAC/000001',
          currency: 'MGA',
          status: InvoiceStatus.PARTIALLY_PAID,
          client: { name: 'Client A' },
        }),
      },
    };
    const prisma = {
      invoice: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'inv-1',
          invoiceNumber: 'FAC/000001',
          status: InvoiceStatus.ISSUED,
          type: InvoiceType.FINAL,
          totalTtc: 10000,
          paidAmount: 0,
          currency: 'MGA',
          referenceLevel: 1,
          clientId: 'cli-1',
          salesOrderId: null,
        }),
      },
      $transaction: jest.fn().mockImplementation(async (cb) => cb(tx)),
    } as unknown as PrismaService;
    const notifications = {
      notifyRole: jest.fn().mockResolvedValue(undefined),
      notifyRoles: jest.fn().mockResolvedValue(undefined),
    } as unknown as NotificationsService;
    const audit = { log: jest.fn() } as unknown as AuditService;

    const service = new InvoicePaymentsService(prisma, audit, notifications);
    const result = await service.recordPayment(
      'inv-1',
      { amount: 2500, paymentMethod: 'BANK_TRANSFER' },
      'user-1',
    );

    expect(tx.invoicePayment.create).toHaveBeenCalled();
    expect(tx.ledgerEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          entryType: 'INCOME',
          amount: 2500,
          invoiceId: 'inv-1',
        }),
      }),
    );
    expect(tx.invoice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          paidAmount: 2500,
          status: InvoiceStatus.PARTIALLY_PAID,
        }),
      }),
    );
    expect(audit.log).toHaveBeenCalled();
    expect(result.status).toBe(InvoiceStatus.PARTIALLY_PAID);
  });

  it('rejects overpayment', async () => {
    const prisma = {
      invoice: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'inv-1',
          invoiceNumber: 'FAC/000001',
          status: InvoiceStatus.ISSUED,
          type: InvoiceType.FINAL,
          totalTtc: 1000,
          paidAmount: 800,
          currency: 'MGA',
          referenceLevel: 1,
          clientId: 'cli-1',
          salesOrderId: null,
        }),
      },
      $transaction: jest.fn(),
    } as unknown as PrismaService;

    const service = new InvoicePaymentsService(
      prisma,
      { log: jest.fn() } as unknown as AuditService,
      { notifyRole: jest.fn(), notifyRoles: jest.fn() } as unknown as NotificationsService,
    );

    await expect(
      service.recordPayment('inv-1', { amount: 300, paymentMethod: 'CASH' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('throws when invoice is missing', async () => {
    const prisma = {
      invoice: { findUnique: jest.fn().mockResolvedValue(null) },
    } as unknown as PrismaService;

    const service = new InvoicePaymentsService(
      prisma,
      { log: jest.fn() } as unknown as AuditService,
      { notifyRole: jest.fn(), notifyRoles: jest.fn() } as unknown as NotificationsService,
    );

    await expect(service.markPaid('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
