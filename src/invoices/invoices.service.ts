import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { mkdir, readFile, unlink, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { ListQueryDto } from '../common/dto/list-query.dto';
import { buildFrenchTextSearchOr } from '../common/query/search.util';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { compressBufferIfNeeded, decompressBufferIfNeeded } from '../ged/compression.util';
import { DEFAULT_GED_BUCKET_ARCHIVE } from '../ged/ged.constants';
import { GedPathsService } from '../ged/ged-paths.service';
import { DocumentReferenceService } from '../common/document-reference/document-reference.service';
import { BUSINESS_DOC_LEVEL_LENGTH } from '../common/document-reference/document-reference.constants';
import { MinioService } from '../ged/minio.service';
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
    private readonly minioService: MinioService,
    private readonly gedPathsService: GedPathsService,
    private readonly documentReferenceService: DocumentReferenceService,
  ) {}

  async findAll(query: ListQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const textOr = await buildFrenchTextSearchOr(this.prisma, {
      term: query.q,
      scalarFields: ['invoiceNumber'],
      relations: [{ table: 'Client', columns: ['name'], foreignKey: 'clientId' }],
    });
    const where = {
      ...(query.status ? { status: query.status as any } : {}),
      ...(query.type ? { type: query.type as any } : {}),
      ...(textOr ? { OR: textOr } : {}),
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
    }).then((items) =>
      items.map((item) => ({
        ...item,
        version: this.extractVersion(item.objectKey ?? item.storagePath),
      })),
    );
  }

  async deleteDocument(invoiceId: string, documentId: string) {
    const document = await this.prisma.invoiceDocument.findFirst({
      where: { id: documentId, invoiceId },
    });
    if (!document) {
      throw new NotFoundException('Document de facture introuvable');
    }

    await this.removeStoredObject(document);
    await this.prisma.invoiceDocument.delete({ where: { id: documentId } });
    return { id: documentId, deleted: true };
  }

  async replaceDocument(
    invoiceId: string,
    documentId: string,
    file: Express.Multer.File,
    userId?: string,
  ) {
    const existing = await this.prisma.invoiceDocument.findFirst({
      where: { id: documentId, invoiceId },
    });
    if (!existing) {
      throw new NotFoundException('Document de facture introuvable');
    }
    if (!file) {
      throw new BadRequestException('Aucun fichier reçu. Champ attendu: file');
    }

    const nextVersion =
      this.extractVersion(existing.objectKey ?? existing.storagePath) + 1;

    const created = await this.uploadDocument(
      invoiceId,
      { kind: existing.kind as any },
      file,
      userId,
      { version: nextVersion },
    );

    return {
      replacedDocumentId: documentId,
      newDocumentId: created.id,
      version: nextVersion,
      document: created,
    };
  }

  async uploadDocument(
    invoiceId: string,
    dto: UploadInvoiceDocumentDto,
    file: Express.Multer.File,
    userId?: string,
    options?: { version?: number },
  ) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: { id: true, referenceLevel: true },
    });
    if (!invoice) {
      throw new NotFoundException('Facture introuvable');
    }
    if (!file) {
      throw new BadRequestException('Aucun fichier reçu. Champ attendu: file');
    }

    const { buffer: storedBuffer, algo } = compressBufferIfNeeded(
      file.buffer,
      file.mimetype,
    );

    const objectKey = this.gedPathsService.buildObjectKey({
      domain: 'finance',
      entityType: 'invoice',
      entityId: invoiceId,
      documentType: `signed-${dto.kind.toLowerCase()}`,
      originalFileName: file.originalname,
      version: options?.version,
    });

    const storedName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    let bucket: string | null = null;
    let persistedObjectKey: string | null = null;
    let storagePath: string | null = null;

    if (this.minioService.isEnabled()) {
      bucket = DEFAULT_GED_BUCKET_ARCHIVE;
      persistedObjectKey = objectKey;
      await this.minioService.putObject({
        bucket,
        key: objectKey,
        body: storedBuffer,
        contentType: file.mimetype,
        contentEncoding: algo === 'GZIP' ? 'gzip' : undefined,
      });
    } else {
      storagePath = join(process.cwd(), 'uploads', 'invoices', objectKey);
      await mkdir(dirname(storagePath), { recursive: true });
      await writeFile(storagePath, storedBuffer);
    }

    return this.prisma.invoiceDocument.create({
      data: {
        invoiceId,
        referenceLevel: invoice.referenceLevel,
        kind: dto.kind as any,
        originalName: file.originalname,
        storedName,
        mimeType: file.mimetype,
        fileSize: file.size,
        storagePath,
        bucket,
        objectKey: persistedObjectKey,
        originalSize: file.size,
        compressedSize: storedBuffer.length,
        compressionAlgo: algo,
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

    let storedBuffer: Buffer;
    if (document.bucket && document.objectKey && this.minioService.isEnabled()) {
      storedBuffer = await this.minioService.getObjectAsBuffer({
        bucket: document.bucket,
        key: document.objectKey,
      });
    } else if (document.storagePath) {
      storedBuffer = await readFile(document.storagePath);
    } else {
      throw new NotFoundException('Fichier de facture indisponible');
    }

    return {
      ...document,
      buffer: decompressBufferIfNeeded(storedBuffer, document.compressionAlgo),
    };
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
          type: normalizedType as any,
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
        } as any,
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
        : (current.type as (typeof INVOICE_TYPES)[number]);
      const targetSalesOrderId = dto.salesOrderId ?? current.salesOrderId ?? null;

      const payload: Record<string, unknown> = { ...dto, type: targetType };
      if (dto.issueDate) {
        payload.issueDate = new Date(dto.issueDate);
      }
      if (dto.dueDate) {
        payload.dueDate = new Date(dto.dueDate);
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
        payload.invoiceNumber = parsed.number;
        payload.referenceLevel = parsed.level;
      } else if (dto.type !== undefined && current.referenceLevel !== null) {
        // If type changes, keep level and just switch prefix.
        payload.invoiceNumber = this.buildInvoiceNumber(
          current.referenceLevel,
          targetType,
        );
        payload.referenceLevel = current.referenceLevel;
      }

      const updated = await tx.invoice.update({
        where: { id },
        data: payload as any,
      });

      if (payload.referenceLevel !== undefined) {
        const referenceLevel = payload.referenceLevel as number;
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
          referenceLevel: invoice.referenceLevel,
          amount: dto.amount,
          paymentMethod: dto.paymentMethod as any,
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
          currency: invoice.currency ?? 'EUR',
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

  private getInvoicePrefix(type: (typeof INVOICE_TYPES)[number]) {
    const map: Record<(typeof INVOICE_TYPES)[number], string> = {
      PROFORMA: 'PRO',
      DEPOSIT: 'ACO',
      INTERMEDIATE: 'INT',
      FINAL: 'FAC',
      CREDIT_NOTE: 'AVO',
    };

    return map[type];
  }

  private buildInvoiceNumber(
    level: number,
    type: (typeof INVOICE_TYPES)[number],
  ) {
    const prefix = this.getInvoicePrefix(type);
    return `${prefix}/${level
      .toString()
      .padStart(BUSINESS_DOC_LEVEL_LENGTH, '0')}`;
  }

  private parseInvoiceNumber(
    rawInvoiceNumber: string,
    type: (typeof INVOICE_TYPES)[number],
  ) {
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

  private async ensureInvoiceExists(invoiceId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: { id: true },
    });

    if (!invoice) {
      throw new NotFoundException('Facture introuvable');
    }
  }

  private extractVersion(pathLike?: string | null): number {
    if (!pathLike) return 1;
    const match = pathLike.match(/\/v(\d+)\//);
    return match ? Number(match[1]) : 1;
  }

  private async removeStoredObject(document: {
    bucket: string | null;
    objectKey: string | null;
    storagePath: string | null;
  }) {
    if (document.bucket && document.objectKey && this.minioService.isEnabled()) {
      await this.minioService.removeObject({
        bucket: document.bucket,
        key: document.objectKey,
      });
      return;
    }

    if (document.storagePath) {
      await unlink(document.storagePath).catch(() => undefined);
    }
  }
}
