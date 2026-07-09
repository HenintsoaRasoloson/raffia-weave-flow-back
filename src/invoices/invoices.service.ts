import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ListQueryDto } from '../common/dto/list-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { UploadInvoiceDocumentDto } from './dto/upload-invoice-document.dto';
import { UpsertInvoiceTemplateDto } from './dto/upsert-invoice-template.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';

const INVOICE_TYPES = ['PROFORMA', 'DEPOSIT', 'INTERMEDIATE', 'FINAL', 'CREDIT_NOTE'] as const;

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  findAll(query: ListQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = {
      ...(query.status ? { status: query.status as any } : {}),
      ...(query.type ? { type: query.type as any } : {}),
      ...(query.q
        ? {
            OR: [
              { invoiceNumber: { contains: query.q } },
              { client: { is: { name: { contains: query.q } } } },
            ],
          }
        : {}),
    };

    return this.prisma.$transaction(async (tx) => {
      const [items, total] = await Promise.all([
        tx.invoice.findMany({
          where,
          include: { client: true, salesOrder: true, items: true },
          orderBy: { issueDate: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        tx.invoice.count({ where }),
      ]);

      return { items, total, page, pageSize };
    });
  }

  findOne(id: string) {
    return this.prisma.invoice.findUnique({
      where: { id },
      include: {
        client: true,
        salesOrder: true,
        items: true,
        payments: true,
        documents: { orderBy: { createdAt: 'desc' } },
      },
    });
  }

  async listDocuments(invoiceId: string) {
    await this.ensureInvoiceExists(invoiceId);
    return this.prisma.invoiceDocument.findMany({
      where: { invoiceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async uploadDocument(
    invoiceId: string,
    dto: UploadInvoiceDocumentDto,
    file: Express.Multer.File,
    userId?: string,
  ) {
    await this.ensureInvoiceExists(invoiceId);
    if (!file) {
      throw new BadRequestException('Aucun fichier reçu. Champ attendu: file');
    }

    return this.prisma.invoiceDocument.create({
      data: {
        invoiceId,
        kind: dto.kind as any,
        originalName: file.originalname,
        storedName: file.filename,
        mimeType: file.mimetype,
        fileSize: file.size,
        storagePath: file.path,
        uploadedById: userId,
      },
    });
  }

  async getDocumentForDownload(invoiceId: string, documentId: string) {
    const document = await this.prisma.invoiceDocument.findFirst({
      where: {
        id: documentId,
        invoiceId,
      },
    });

    if (!document) {
      throw new NotFoundException('Document de facture introuvable');
    }

    return document;
  }

  listTemplates() {
    return this.prisma.invoiceTemplate.findMany({ orderBy: { type: 'asc' } });
  }

  async getTemplate(type: string) {
    const normalizedType = this.normalizeInvoiceType(type);

    const existing = await this.prisma.invoiceTemplate.findUnique({
      where: { type: normalizedType as any },
    });

    if (existing) {
      return existing;
    }

    return {
      type: normalizedType,
      name: `Template ${normalizedType}`,
      subject: `Facture {{invoiceNumber}} - ${normalizedType}`,
      body:
        'Bonjour {{clientName}},\n\nVeuillez trouver votre facture {{invoiceNumber}} de {{totalTtc}} {{currency}}.\n\nMerci pour votre confiance.',
      footer: 'Raffia Weave Flow',
      isDefault: true,
    };
  }

  upsertTemplate(type: string, dto: UpsertInvoiceTemplateDto) {
    const normalizedType = this.normalizeInvoiceType(type);

    return this.prisma.invoiceTemplate.upsert({
      where: { type: normalizedType as any },
      update: {
        name: dto.name,
        subject: dto.subject,
        body: dto.body,
        footer: dto.footer,
      },
      create: {
        type: normalizedType as any,
        name: dto.name,
        subject: dto.subject,
        body: dto.body,
        footer: dto.footer,
      },
    });
  }

  async create(dto: CreateInvoiceDto, userId?: string) {
    const items = dto.items ?? [];
    const subtotalHt = items.reduce(
      (sum, item) => sum + item.quantity * item.unitPriceHt,
      0,
    );
    const taxAmount = items.reduce((sum, item) => {
      const line = item.quantity * item.unitPriceHt;
      const taxRate = item.taxRate ?? 20;
      return sum + line * (taxRate / 100);
    }, 0);
    const totalTtc = subtotalHt + taxAmount;

    const created = await this.prisma.invoice.create({
      data: {
        invoiceNumber: dto.invoiceNumber,
        type: dto.type as any,
        status: (dto.status ?? 'ISSUED') as any,
        clientId: dto.clientId,
        salesOrderId: dto.salesOrderId,
        issueDate: new Date(dto.issueDate),
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        subtotalHt,
        taxAmount,
        totalTtc,
        currency: dto.currency ?? 'EUR',
        notes: dto.notes,
        items: {
          create: items.map((item) => {
            const lineTotalHt = item.quantity * item.unitPriceHt;
            return {
              description: item.description,
              quantity: item.quantity,
              unitPriceHt: item.unitPriceHt,
              taxRate: item.taxRate ?? 20,
              lineTotalHt,
              salesOrderItemId: item.salesOrderItemId,
              productId: item.productId,
              variantId: item.variantId,
            };
          }),
        },
      } as any,
      include: { items: true, client: true },
    });

    if (userId) {
      await this.auditService.log({
        entityType: 'Invoice',
        entityId: created.id,
        action: 'INVOICE_CREATED',
        userId,
        changes: {
          invoiceNumber: { after: dto.invoiceNumber },
          type: { after: dto.type },
          totalTtc: { after: totalTtc },
        },
      });
    }

    // Quand la proforma est créée, notifier le resp général pour qu'il l'envoie au client
    if (dto.type === 'PROFORMA') {
      this.notificationsService.notifyRole('RESPONSABLE_GENERAL', {
        type: 'proforma_ready',
        title: '📄 Proforma prête à envoyer',
        message: `${created.invoiceNumber} - ${created.client?.name ?? 'Client'} (${totalTtc.toFixed(2)} ${dto.currency ?? 'EUR'})`,
        data: {
          invoiceId: created.id,
          invoiceNumber: created.invoiceNumber,
          clientName: created.client?.name,
          totalTtc,
        },
        actionUrl: `/invoices/${created.id}`,
        priority: 'normal',
      }).catch((err) => console.error('Notification proforma error:', err));
    }

    return created;
  }

  update(id: string, dto: UpdateInvoiceDto) {
    const payload: Record<string, unknown> = { ...dto };
    if (dto.issueDate) {
      payload.issueDate = new Date(dto.issueDate);
    }
    if (dto.dueDate) {
      payload.dueDate = new Date(dto.dueDate);
    }

    return this.prisma.invoice.update({
      where: { id },
      data: payload as any,
    });
  }

  async markPaid(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      select: { status: true, type: true, totalTtc: true },
    });
    if (!invoice) {
      throw new NotFoundException('Facture introuvable');
    }

    const current = invoice.status as unknown as string;
    if (current === 'PAID') {
      throw new BadRequestException('La facture est deja payee');
    }
    if (current === 'CANCELLED' || current === 'DRAFT') {
      throw new BadRequestException(
        `Transition invalide: ${current} -> PAID`,
      );
    }
    if (invoice.type === 'CREDIT_NOTE') {
      throw new BadRequestException(
        'Un avoir ne peut pas etre marque comme paye',
      );
    }

    return this.prisma.invoice.update({
      where: { id },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        paidAmount: invoice.totalTtc,
      } as any,
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

    const current = invoice.status as unknown as string;
    if (current === 'PAID') {
      throw new BadRequestException('La facture est deja payee');
    }
    if (current === 'CANCELLED' || current === 'DRAFT') {
      throw new BadRequestException(
        `Transition invalide: ${current} -> PAID`,
      );
    }
    if (invoice.type === 'CREDIT_NOTE') {
      throw new BadRequestException(
        'Un avoir ne peut pas etre marque comme paye',
      );
    }

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        paidAmount: invoice.totalTtc,
      } as any,
    });

    if (userId) {
      await this.auditService.log({
        entityType: 'Invoice',
        entityId: id,
        action: 'INVOICE_MARKED_PAID',
        userId,
        changes: { status: { before: current, after: 'PAID' } },
      });
    }

    return updated;
  }

  async recordPayment(id: string, dto: RecordPaymentDto, userId?: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      select: { status: true, type: true, totalTtc: true, paidAmount: true, currency: true },
    });
    if (!invoice) {
      throw new NotFoundException('Facture introuvable');
    }
    if ((invoice.status as unknown as string) === 'PAID') {
      throw new BadRequestException('La facture est déjà intégralement payée');
    }
    if (['CANCELLED', 'DRAFT'].includes(invoice.status as unknown as string)) {
      throw new BadRequestException(
        `Impossible d\'enregistrer un paiement sur une facture ${invoice.status}`,
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
          amount: dto.amount,
          paymentMethod: dto.paymentMethod as any,
          paidAt,
          notes: dto.notes,
        },
      });

      const updated = await tx.invoice.update({
        where: { id },
        data: {
          paidAmount: newPaidAmount,
          status: isFullyPaid ? 'PAID' : 'PARTIALLY_PAID',
          paidAt: isFullyPaid ? paidAt : null,
        } as any,
        include: { items: true, client: true, payments: true },
      });

      if (userId) {
        // Log AFTER transaction
        await this.auditService.log({
          entityType: 'Invoice',
          entityId: id,
          action: 'INVOICE_PAYMENT_RECORDED',
          userId,
          changes: {
            paidAmount: { before: alreadyPaid, after: newPaidAmount },
            paymentMethod: { after: dto.paymentMethod },
          },
          details: `${dto.amount} ${invoice.currency ?? 'EUR'} par ${dto.paymentMethod}`,
        });
      }

      // Notifier selon le montant du paiement
      if (dto.amount > 5000) {
        await this.notificationsService.notifyRole('GERANT', {
          type: 'large_payment_received',
          title: '💰 Paiement important reçu',
          message: `${dto.amount.toFixed(2)} EUR - Facture ${updated.invoiceNumber}`,
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

      // Toujours notifier le responsable financier
      await this.notificationsService.notifyRole(
        'RESPONSABLE_FINANCIER_STOCKS',
        {
          type: 'payment_recorded',
          title: '📝 Paiement enregistré',
          message: `${dto.amount.toFixed(2)} EUR - ${updated.invoiceNumber}`,
          data: {
            invoiceId: id,
            amount: dto.amount,
            status: updated.status,
          },
          actionUrl: `/invoices/${id}`,
        },
      );

      // Notifier si facture entièrement payée
      if (isFullyPaid) {
        await this.notificationsService.notifyRoles(
          ['GERANT', 'RESPONSABLE_GENERAL'],
          {
            type: 'invoice_fully_paid',
            title: '✅ Facture intégralement payée',
            message: `${updated.invoiceNumber} (${newPaidAmount.toFixed(2)} EUR)`,
            data: { invoiceId: id, totalAmount: newPaidAmount },
            actionUrl: `/invoices/${id}`,
          },
        )
          .catch((err) => console.error('Notification error:', err));
      }

      return updated;
    });
  }

  remove(id: string) {
    return this.prisma.invoice.delete({ where: { id } });
  }

  private normalizeInvoiceType(type: string): (typeof INVOICE_TYPES)[number] {
    const normalized = type?.toUpperCase();
    if (!INVOICE_TYPES.includes(normalized as (typeof INVOICE_TYPES)[number])) {
      throw new BadRequestException(
        `Type de facture invalide. Valeurs autorisées: ${INVOICE_TYPES.join(', ')}`,
      );
    }

    return normalized as (typeof INVOICE_TYPES)[number];
  }

  private async ensureInvoiceExists(invoiceId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: { id: true },
    });

    if (!invoice) {
      throw new NotFoundException('Facture introuvable');
    }
  }
}
