import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client';
import {
  InvoiceStatus,
  InvoiceType,
} from '../generated/prisma/client';
import { ListQueryDto } from '../common/dto/list-query.dto';
import { enumWhere } from '../common/prisma/enum-filter.util';
import { dateFieldWhere, optionalEquals } from '../common/query/date-range.util';
import { buildFrenchTextSearchOr } from '../common/query/search.util';
import { resolveOrderBy } from '../common/query/sort.util';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { DocumentReferenceService } from '../common/document-reference/document-reference.service';
import { BUSINESS_DOC_LEVEL_LENGTH } from '../common/document-reference/document-reference.constants';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { UploadInvoiceDocumentDto } from './dto/upload-invoice-document.dto';
import { InvoiceTemplateResponseDto } from './dto/invoice-template-response.dto';
import { UpsertInvoiceTemplateDto } from './dto/upsert-invoice-template.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { InvoiceDocumentsService } from './invoice-documents.service';
import { InvoicePaymentsService } from './invoice-payments.service';

const INVOICE_TYPES = Object.values(InvoiceType);
type InvoiceTypeValue = (typeof INVOICE_TYPES)[number];
const INVOICE_SORT_FIELDS = ['issueDate', 'createdAt', 'dueDate', 'totalTtc', 'invoiceNumber'] as const;

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
    private readonly documentReferenceService: DocumentReferenceService,
    private readonly documentsService: InvoiceDocumentsService,
    private readonly paymentsService: InvoicePaymentsService,
  ) {}

  async findAll(query: ListQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const textOr = await buildFrenchTextSearchOr(this.prisma, {
      term: query.q,
      scalarFields: ['invoiceNumber'],
      relations: [{ table: 'Client', columns: ['name'], foreignKey: 'clientId' }],
    });
    const where: Prisma.InvoiceWhereInput = {
      ...enumWhere('status', query.status, InvoiceStatus),
      ...enumWhere('type', query.type, InvoiceType),
      ...optionalEquals('clientId', query.clientId),
      ...optionalEquals('salesOrderId', query.salesOrderId),
      ...dateFieldWhere('issueDate', query.dateFrom, query.dateTo),
      ...(textOr ? { OR: textOr } : {}),
    };

    return this.prisma.$transaction(async (tx) => {
      const [items, total] = await Promise.all([
        tx.invoice.findMany({
          where,
          include: { client: true, salesOrder: true, items: true },
          orderBy: resolveOrderBy(query, INVOICE_SORT_FIELDS, 'issueDate'),
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

  listDocuments(invoiceId: string) {
    return this.documentsService.listDocuments(invoiceId);
  }

  deleteDocument(invoiceId: string, documentId: string) {
    return this.documentsService.deleteDocument(invoiceId, documentId);
  }

  replaceDocument(
    invoiceId: string,
    documentId: string,
    file: Express.Multer.File,
    userId?: string,
  ) {
    return this.documentsService.replaceDocument(
      invoiceId,
      documentId,
      file,
      userId,
    );
  }

  uploadDocument(
    invoiceId: string,
    dto: UploadInvoiceDocumentDto,
    file: Express.Multer.File,
    userId?: string,
    options?: { version?: number },
  ) {
    return this.documentsService.uploadDocument(
      invoiceId,
      dto,
      file,
      userId,
      options,
    );
  }

  getDocumentForDownload(invoiceId: string, documentId: string) {
    return this.documentsService.getDocumentForDownload(invoiceId, documentId);
  }

  listTemplates(): Promise<InvoiceTemplateResponseDto[]> {
    return this.prisma.invoiceTemplate.findMany({ orderBy: { type: 'asc' } });
  }

  async getTemplate(type: string): Promise<InvoiceTemplateResponseDto> {
    const normalizedType = this.normalizeInvoiceType(type);

    const existing = await this.prisma.invoiceTemplate.findUnique({
      where: { type: normalizedType },
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

  upsertTemplate(
    type: string,
    dto: UpsertInvoiceTemplateDto,
  ): Promise<InvoiceTemplateResponseDto> {
    const normalizedType = this.normalizeInvoiceType(type);

    return this.prisma.invoiceTemplate.upsert({
      where: { type: normalizedType },
      update: {
        name: dto.name,
        subject: dto.subject,
        body: dto.body,
        footer: dto.footer,
      },
      create: {
        type: normalizedType,
        name: dto.name,
        subject: dto.subject,
        body: dto.body,
        footer: dto.footer,
      },
    });
  }

  async create(dto: CreateInvoiceDto, userId?: string) {
    const normalizedType = this.normalizeInvoiceType(dto.type);
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

    const created = await this.prisma.$transaction(async (tx) => {
      let referenceLevel: number | null = null;

      if (dto.salesOrderId) {
        const salesOrder = await tx.salesOrder.findUnique({
          where: { id: dto.salesOrderId },
          select: { id: true, referenceLevel: true },
        });
        if (!salesOrder) {
          throw new NotFoundException('Commande liee introuvable');
        }

        referenceLevel = salesOrder.referenceLevel;
        if (referenceLevel === null) {
          referenceLevel = await this.documentReferenceService.allocateNextReferenceLevel(tx);
          await tx.salesOrder.update({
            where: { id: salesOrder.id },
            data: { referenceLevel },
          });
        }
      }

      let invoiceNumber: string;
      if (dto.invoiceNumber?.trim()) {
        const parsed = this.parseInvoiceNumber(dto.invoiceNumber, normalizedType);
        if (referenceLevel !== null && parsed.level !== referenceLevel) {
          throw new BadRequestException(
            `Reference facture invalide: le niveau ${parsed.level} doit correspondre au niveau commande ${referenceLevel}`,
          );
        }

        referenceLevel = referenceLevel ?? parsed.level;
        invoiceNumber = parsed.number;
      } else {
        referenceLevel = referenceLevel ?? (await this.documentReferenceService.allocateNextReferenceLevel(tx));
        invoiceNumber = this.buildInvoiceNumber(referenceLevel, normalizedType);
      }

      return tx.invoice.create({
        data: {
          invoiceNumber,
          referenceLevel,
          type: normalizedType,
          status: dto.status ?? InvoiceStatus.ISSUED,
          clientId: dto.clientId,
          salesOrderId: dto.salesOrderId,
          issueDate: new Date(dto.issueDate),
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
          subtotalHt,
          taxAmount,
          totalTtc,
          currency: dto.currency ?? 'MGA',
          notes: dto.notes,
          items: {
            create: items.map((item) => {
              const lineTotalHt = item.quantity * item.unitPriceHt;
              return {
                referenceLevel,
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
        },
        include: { items: true, client: true },
      });
    });

    if (userId) {
      await this.auditService.log({
        entityType: 'Invoice',
        entityId: created.id,
        action: 'INVOICE_CREATED',
        userId,
        changes: {
          invoiceNumber: { after: created.invoiceNumber },
          type: { after: created.type },
          totalTtc: { after: totalTtc },
        },
      });
    }

    // Quand la proforma est créée, notifier le resp général pour qu'il l'envoie au client
    if (normalizedType === 'PROFORMA') {
      this.notificationsService.notifyRole('RESPONSABLE_GENERAL', {
        type: 'proforma_ready',
        title: '📄 Proforma prête à envoyer',
        message: `${created.invoiceNumber} - ${created.client?.name ?? 'Client'} (${totalTtc.toFixed(2)} ${dto.currency ?? 'MGA'})`,
        data: {
          invoiceId: created.id,
          invoiceNumber: created.invoiceNumber,
          clientName: created.client?.name,
          totalTtc,
        },
        actionUrl: `/invoices/${created.id}`,
        priority: 'normal',
      }).catch((err) =>
        this.logger.error({
          msg: 'Notification proforma error',
          invoiceId: created.id,
          error: err instanceof Error ? err.message : String(err),
        }),
      );
    }

    return created;
  }

  update(id: string, dto: UpdateInvoiceDto) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.invoice.findUnique({
        where: { id },
        select: {
          id: true,
          type: true,
          referenceLevel: true,
          salesOrderId: true,
        },
      });
      if (!current) {
        throw new NotFoundException('Facture introuvable');
      }

      const targetType = dto.type
        ? this.normalizeInvoiceType(dto.type)
        : current.type;
      const targetSalesOrderId = dto.salesOrderId ?? current.salesOrderId ?? null;

      const data: Prisma.InvoiceUpdateInput = {
        type: targetType,
        ...(dto.clientId !== undefined ? { clientId: dto.clientId } : {}),
        ...(dto.salesOrderId !== undefined ? { salesOrderId: dto.salesOrderId } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.currency !== undefined ? { currency: dto.currency } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      };

      if (dto.issueDate) {
        data.issueDate = new Date(dto.issueDate);
      }
      if (dto.dueDate) {
        data.dueDate = new Date(dto.dueDate);
      }

      let linkedOrderLevel: number | null = null;
      if (targetSalesOrderId) {
        const salesOrder = await tx.salesOrder.findUnique({
          where: { id: targetSalesOrderId },
          select: { id: true, referenceLevel: true },
        });
        if (!salesOrder) {
          throw new NotFoundException('Commande liee introuvable');
        }

        linkedOrderLevel = salesOrder.referenceLevel;
      }

      if (dto.invoiceNumber !== undefined) {
        const parsed = this.parseInvoiceNumber(dto.invoiceNumber, targetType);
        if (linkedOrderLevel !== null && parsed.level !== linkedOrderLevel) {
          throw new BadRequestException(
            `Reference facture invalide: le niveau ${parsed.level} doit correspondre au niveau commande ${linkedOrderLevel}`,
          );
        }
        data.invoiceNumber = parsed.number;
        data.referenceLevel = parsed.level;
      } else if (dto.type !== undefined && current.referenceLevel !== null) {
        data.invoiceNumber = this.buildInvoiceNumber(
          current.referenceLevel,
          targetType,
        );
        data.referenceLevel = current.referenceLevel;
      }

      const updated = await tx.invoice.update({
        where: { id },
        data,
      });

      if (data.referenceLevel !== undefined && typeof data.referenceLevel === 'number') {
        const referenceLevel = data.referenceLevel;
        await tx.invoiceItem.updateMany({
          where: { invoiceId: id },
          data: { referenceLevel },
        });
        await tx.invoicePayment.updateMany({
          where: { invoiceId: id },
          data: { referenceLevel },
        });
        await tx.invoiceDocument.updateMany({
          where: { invoiceId: id },
          data: { referenceLevel },
        });
      }

      return updated;
    });
  }

  markPaid(id: string) {
    return this.paymentsService.markPaid(id);
  }

  markPaidWithAudit(id: string, userId?: string) {
    return this.paymentsService.markPaidWithAudit(id, userId);
  }

  recordPayment(id: string, dto: RecordPaymentDto, userId?: string) {
    return this.paymentsService.recordPayment(id, dto, userId);
  }

  remove(id: string) {
    return this.prisma.invoice.delete({ where: { id } });
  }

  private normalizeInvoiceType(type: string): InvoiceTypeValue {
    const normalized = type?.toUpperCase();
    if (!INVOICE_TYPES.includes(normalized as InvoiceTypeValue)) {
      throw new BadRequestException(
        `Type de facture invalide. Valeurs autorisées: ${INVOICE_TYPES.join(', ')}`,
      );
    }

    return normalized as InvoiceTypeValue;
  }

  private getInvoicePrefix(type: InvoiceTypeValue) {
    const map: Record<InvoiceTypeValue, string> = {
      PROFORMA: 'PRO',
      DEPOSIT: 'ACO',
      INTERMEDIATE: 'INT',
      FINAL: 'FAC',
      CREDIT_NOTE: 'AVO',
    };

    return map[type];
  }

  private buildInvoiceNumber(level: number, type: InvoiceTypeValue) {
    const prefix = this.getInvoicePrefix(type);
    return `${prefix}/${level
      .toString()
      .padStart(BUSINESS_DOC_LEVEL_LENGTH, '0')}`;
  }

  private parseInvoiceNumber(rawInvoiceNumber: string, type: InvoiceTypeValue) {
    const normalized = rawInvoiceNumber.trim().toUpperCase();
    const prefix = this.getInvoicePrefix(type);
    const regex = new RegExp(
      `^${prefix}\\/(\\d{${BUSINESS_DOC_LEVEL_LENGTH}})$`,
    );
    const match = normalized.match(regex);
    if (!match) {
      throw new BadRequestException(
        `Format facture invalide pour ${type}. Attendu: ${prefix}/${'0'.repeat(BUSINESS_DOC_LEVEL_LENGTH)}`,
      );
    }

    return {
      number: normalized,
      level: Number(match[1]),
    };
  }

}
