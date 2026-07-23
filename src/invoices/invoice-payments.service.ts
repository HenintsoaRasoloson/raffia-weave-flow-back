import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InvoiceStatus, InvoiceType } from '../generated/prisma/client';
import { AuditService } from '../common/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { RecordPaymentDto } from './dto/record-payment.dto';

@Injectable()
export class InvoicePaymentsService {
  private readonly logger = new Logger(InvoicePaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async markPaid(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      select: { status: true, type: true, totalTtc: true },
    });
    if (!invoice) {
      throw new NotFoundException('Facture introuvable');
    }

    this.assertCanMarkPaid(invoice);

    return this.prisma.invoice.update({
      where: { id },
      data: {
        status: InvoiceStatus.PAID,
        paidAt: new Date(),
        paidAmount: invoice.totalTtc,
      },
    });
  }

  async markPaidWithAudit(id: string, userId?: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      select: { status: true, type: true, totalTtc: true },
    });
    if (!invoice) {
      throw new NotFoundException('Facture introuvable');
    }

    this.assertCanMarkPaid(invoice);

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: {
        status: InvoiceStatus.PAID,
        paidAt: new Date(),
        paidAmount: invoice.totalTtc,
      },
    });

    if (userId) {
      await this.auditService.log({
        entityType: 'Invoice',
        entityId: id,
        action: 'INVOICE_MARKED_PAID',
        userId,
        changes: { status: { before: invoice.status, after: 'PAID' } },
      });
    }

    return updated;
  }

  async recordPayment(id: string, dto: RecordPaymentDto, userId?: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
        type: true,
        totalTtc: true,
        paidAmount: true,
        currency: true,
        referenceLevel: true,
        clientId: true,
        salesOrderId: true,
      },
    });
    if (!invoice) {
      throw new NotFoundException('Facture introuvable');
    }
    if (invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestException('La facture est déjà intégralement payée');
    }
    if (
      invoice.status === InvoiceStatus.CANCELLED ||
      invoice.status === InvoiceStatus.DRAFT
    ) {
      throw new BadRequestException(
        `Impossible d'enregistrer un paiement sur une facture ${invoice.status}`,
      );
    }

    const alreadyPaid = Number(invoice.paidAmount ?? 0);
    const total = Number(invoice.totalTtc);
    const newPaidAmount = alreadyPaid + dto.amount;

    if (newPaidAmount > total) {
      throw new BadRequestException(
        `Le montant encaissé (${newPaidAmount}) dépasse le total TTC (${total})`,
      );
    }

    const isFullyPaid = newPaidAmount >= total;
    const paidAt = dto.paidAt ? new Date(dto.paidAt) : new Date();

    return this.prisma.$transaction(async (tx) => {
      await tx.invoicePayment.create({
        data: {
          invoiceId: id,
          referenceLevel: invoice.referenceLevel,
          amount: dto.amount,
          paymentMethod: dto.paymentMethod,
          paidAt,
          notes: dto.notes,
        },
      });

      const category = await tx.ledgerCategory.upsert({
        where: { code: 'CLIENT_COLLECTION' },
        update: {
          name: 'Encaissement client',
          entryType: 'INCOME',
          description: 'Encaissements reels des factures clients',
          active: true,
          isSystem: true,
        },
        create: {
          code: 'CLIENT_COLLECTION',
          name: 'Encaissement client',
          entryType: 'INCOME',
          description: 'Encaissements reels des factures clients',
          active: true,
          isSystem: true,
        },
      });

      await tx.ledgerEntry.create({
        data: {
          entryDate: paidAt,
          label: `Encaissement facture ${invoice.invoiceNumber}`,
          entryType: 'INCOME',
          amount: dto.amount,
          currency: invoice.currency ?? 'MGA',
          ledgerCategoryId: category.id,
          clientId: invoice.clientId,
          salesOrderId: invoice.salesOrderId,
          invoiceId: invoice.id,
          notes: dto.notes,
        },
      });

      const updated = await tx.invoice.update({
        where: { id },
        data: {
          paidAmount: newPaidAmount,
          status: isFullyPaid
            ? InvoiceStatus.PAID
            : InvoiceStatus.PARTIALLY_PAID,
          paidAt: isFullyPaid ? paidAt : null,
        },
        include: { items: true, client: true, payments: true },
      });

      if (userId) {
        await this.auditService.log({
          entityType: 'Invoice',
          entityId: id,
          action: 'INVOICE_PAYMENT_RECORDED',
          userId,
          changes: {
            paidAmount: { before: alreadyPaid, after: newPaidAmount },
            paymentMethod: { after: dto.paymentMethod },
          },
          details: `${dto.amount} ${invoice.currency ?? 'MGA'} par ${dto.paymentMethod}`,
        });
      }

      if (dto.amount > 5000) {
        await this.notificationsService.notifyRole('GERANT', {
          type: 'large_payment_received',
          title: '💰 Paiement important reçu',
          message: `${dto.amount.toFixed(2)} ${updated.currency ?? 'MGA'} - Facture ${updated.invoiceNumber}`,
          data: {
            invoiceId: id,
            amount: dto.amount,
            clientName: updated.client?.name,
            paymentMethod: dto.paymentMethod,
          },
          actionUrl: `/invoices/${id}`,
          priority: 'high',
        });
      }

      await this.notificationsService.notifyRole(
        'RESPONSABLE_FINANCIER_STOCKS',
        {
          type: 'payment_recorded',
          title: '📝 Paiement enregistré',
          message: `${dto.amount.toFixed(2)} ${updated.currency ?? 'MGA'} - ${updated.invoiceNumber}`,
          data: {
            invoiceId: id,
            amount: dto.amount,
            status: updated.status,
          },
          actionUrl: `/invoices/${id}`,
        },
      );

      if (isFullyPaid) {
        await this.notificationsService
          .notifyRoles(['GERANT', 'RESPONSABLE_GENERAL'], {
            type: 'invoice_fully_paid',
            title: '✅ Facture intégralement payée',
            message: `${updated.invoiceNumber} (${newPaidAmount.toFixed(2)} ${updated.currency ?? 'MGA'})`,
            data: { invoiceId: id, totalAmount: newPaidAmount },
            actionUrl: `/invoices/${id}`,
          })
          .catch((err) =>
            this.logger.error({
              msg: 'Notification error after full payment',
              invoiceId: id,
              error: err instanceof Error ? err.message : String(err),
            }),
          );
      }

      return updated;
    });
  }

  private assertCanMarkPaid(invoice: {
    status: InvoiceStatus;
    type: InvoiceType;
  }) {
    if (invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestException('La facture est deja payee');
    }
    if (
      invoice.status === InvoiceStatus.CANCELLED ||
      invoice.status === InvoiceStatus.DRAFT
    ) {
      throw new BadRequestException(
        `Transition invalide: ${invoice.status} -> PAID`,
      );
    }
    if (invoice.type === InvoiceType.CREDIT_NOTE) {
      throw new BadRequestException(
        'Un avoir ne peut pas etre marque comme paye',
      );
    }
  }
}
