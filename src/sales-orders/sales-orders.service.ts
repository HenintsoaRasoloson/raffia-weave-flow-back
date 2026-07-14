import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { mkdir, readFile, unlink, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import type { Prisma } from '../generated/prisma/client';
import {
  ClientType,
  SalesOrderStatus,
} from '../generated/prisma/client';
import { ListQueryDto } from '../common/dto/list-query.dto';
import { enumWhere } from '../common/prisma/enum-filter.util';
import { buildFrenchTextSearchOr } from '../common/query/search.util';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { compressBufferIfNeeded, decompressBufferIfNeeded } from '../ged/compression.util';
import { DEFAULT_GED_BUCKET_RAW } from '../ged/ged.constants';
import { GedPathsService } from '../ged/ged-paths.service';
import { MinioService } from '../ged/minio.service';
import { DocumentReferenceService } from '../common/document-reference/document-reference.service';
import { SALES_ORDER_STATUS_TRANSITIONS } from '../common/domain/sales-order-status.transitions';
import { CreateSalesOrderDto } from './dto/create-sales-order.dto';
import { UploadBatDocumentDto } from './dto/upload-bat-document.dto';
import { UpdateSalesOrderStatusDto } from './dto/update-sales-order-status.dto';
import { UpdateSalesOrderDto } from './dto/update-sales-order.dto';

const SALES_ORDER_PREFIX = 'CMD';

@Injectable()
export class SalesOrdersService {
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
      scalarFields: ['orderNumber'],
      relations: [{ table: 'Client', columns: ['name'], foreignKey: 'clientId' }],
    });
    const where: Prisma.SalesOrderWhereInput = {
      ...enumWhere('status', query.status, SalesOrderStatus),
      ...enumWhere('orderType', query.type, ClientType),
      ...(textOr ? { OR: textOr } : {}),
    };

    return this.prisma.$transaction(async (tx) => {
      const [items, total] = await Promise.all([
        tx.salesOrder.findMany({
          where,
          include: { client: true, items: true, invoices: true, deliveries: true },
          orderBy: { orderDate: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        tx.salesOrder.count({ where }),
      ]);

      return { items, total, page, pageSize };
    });
  }

  findOne(id: string) {
    return this.prisma.salesOrder.findUnique({
      where: { id },
      include: {
        client: true,
        items: true,
        invoices: true,
        deliveries: true,
        productionOrders: true,
        batDocuments: { orderBy: { createdAt: 'desc' } },
      },
    });
  }

  async listBatDocuments(salesOrderId: string) {
    await this.ensureSalesOrderExists(salesOrderId);
    return this.prisma.batDocument.findMany({
      where: { salesOrderId },
      orderBy: { createdAt: 'desc' },
    }).then((items) =>
      items.map((item) => ({
        ...item,
        version: this.extractVersion(item.objectKey ?? item.storagePath),
      })),
    );
  }

  async deleteBatDocument(salesOrderId: string, documentId: string) {
    const document = await this.prisma.batDocument.findFirst({
      where: { id: documentId, salesOrderId },
    });
    if (!document) {
      throw new NotFoundException('Document BAT introuvable');
    }

    await this.removeStoredObject(document);
    await this.prisma.batDocument.delete({ where: { id: documentId } });

    return { id: documentId, deleted: true };
  }

  async replaceBatDocument(
    salesOrderId: string,
    documentId: string,
    file: Express.Multer.File,
    userId?: string,
  ) {
    const existing = await this.prisma.batDocument.findFirst({
      where: { id: documentId, salesOrderId },
    });
    if (!existing) {
      throw new NotFoundException('Document BAT introuvable');
    }
    if (!file) {
      throw new BadRequestException('Aucun fichier BAT reçu.');
    }

    const nextVersion =
      this.extractVersion(existing.objectKey ?? existing.storagePath) + 1;

    const created = await this.uploadBatDocument(
      salesOrderId,
      { kind: existing.kind },
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

  async uploadBatDocument(
    salesOrderId: string,
    dto: UploadBatDocumentDto,
    file: Express.Multer.File,
    userId?: string,
    options?: { version?: number },
  ) {
    const order = await this.prisma.salesOrder.findUnique({
      where: { id: salesOrderId },
      select: { id: true, batRequired: true, referenceLevel: true },
    });
    if (!order) {
      throw new NotFoundException('Commande introuvable');
    }
    if (!order.batRequired) {
      throw new BadRequestException(
        'Cette commande ne nécessite pas de BAT (batRequired = false).',
      );
    }
    if (!file) {
      throw new BadRequestException('Aucun fichier BAT reçu.');
    }

    const { buffer: storedBuffer, algo } = compressBufferIfNeeded(
      file.buffer,
      file.mimetype,
    );
    const objectKey = this.gedPathsService.buildObjectKey({
      domain: 'sales',
      entityType: 'sales-order',
      entityId: salesOrderId,
      documentType: `bat-${dto.kind.toLowerCase()}`,
      originalFileName: file.originalname,
      version: options?.version,
    });

    let bucket: string | null = null;
    let persistedObjectKey: string | null = null;
    let storagePath: string | null = null;

    if (this.minioService.isEnabled()) {
      bucket = DEFAULT_GED_BUCKET_RAW;
      persistedObjectKey = objectKey;
      await this.minioService.putObject({
        bucket,
        key: objectKey,
        body: storedBuffer,
        contentType: file.mimetype,
        contentEncoding: algo === 'GZIP' ? 'gzip' : undefined,
      });
    } else {
      storagePath = join(process.cwd(), 'uploads', 'ged', objectKey);
      await mkdir(dirname(storagePath), { recursive: true });
      await writeFile(storagePath, storedBuffer);
    }

    return this.prisma.batDocument.create({
      data: {
        salesOrderId,
        referenceLevel: order.referenceLevel,
        kind: dto.kind,
        originalName: file.originalname,
        mimeType: file.mimetype,
        bucket,
        objectKey: persistedObjectKey,
        storagePath,
        originalSize: file.size,
        compressedSize: storedBuffer.length,
        compressionAlgo: algo,
        uploadedById: userId,
      },
    });
  }

  async getBatDocumentBinary(salesOrderId: string, documentId: string) {
    const document = await this.prisma.batDocument.findFirst({
      where: { id: documentId, salesOrderId },
    });
    if (!document) {
      throw new NotFoundException('Document BAT introuvable');
    }

    let storedBuffer: Buffer;
    if (
      document.bucket &&
      document.objectKey &&
      this.minioService.isEnabled()
    ) {
      storedBuffer = await this.minioService.getObjectAsBuffer({
        bucket: document.bucket,
        key: document.objectKey,
      });
    } else if (document.storagePath) {
      storedBuffer = await readFile(document.storagePath);
    } else {
      throw new NotFoundException('Fichier BAT indisponible');
    }

    return {
      originalName: document.originalName,
      mimeType: document.mimeType,
      buffer: decompressBufferIfNeeded(storedBuffer, document.compressionAlgo),
    };
  }

  async create(dto: CreateSalesOrderDto, userId?: string) {
    const taxRate = dto.taxRate ?? 20;
    const items = dto.items ?? [];
    const totalHt = items.reduce(
      (sum, item) => sum + item.quantity * item.unitPriceHt,
      0,
    );
    const totalTtc = totalHt * (1 + taxRate / 100);

    const created = await this.prisma.$transaction(async (tx) => {
      let referenceLevel: number;
      let orderNumber: string;

      if (dto.orderNumber?.trim()) {
        const parsed = this.documentReferenceService.parseReferenceNumber(
          SALES_ORDER_PREFIX,
          dto.orderNumber,
          'de commande',
        );
        referenceLevel = parsed.level;
        orderNumber = parsed.number;
      } else {
        referenceLevel = await this.documentReferenceService.allocateNextReferenceLevel(tx);
        orderNumber = this.documentReferenceService.buildReferenceNumber(
          SALES_ORDER_PREFIX,
          referenceLevel,
        );
      }

      return tx.salesOrder.create({
        data: {
          orderNumber,
          referenceLevel,
          clientId: dto.clientId,
          orderType: dto.orderType,
          status: dto.status ?? SalesOrderStatus.TO_PROCESS,
          orderDate: new Date(dto.orderDate),
          taxRate,
          totalHt,
          totalTtc,
          currency: dto.currency ?? 'EUR',
          notes: dto.notes,
          batRequired: dto.batRequired ?? false,
          items: {
            create: items.map((item) => {
              const lineTotalHt = item.quantity * item.unitPriceHt;
              return {
                referenceLevel,
                description: item.description,
                quantity: item.quantity,
                unitPriceHt: item.unitPriceHt,
                taxRate: item.taxRate ?? taxRate,
                lineTotalHt,
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
        entityType: 'SalesOrder',
        entityId: created.id,
        action: 'SALES_ORDER_CREATED',
        userId,
        changes: {
          orderNumber: { after: created.orderNumber },
          status: { after: dto.status ?? 'TO_PROCESS' },
          totalTtc: { after: totalTtc },
        },
      });
    }

    // Notifier les rôles concernés (dont le financier pour créer la proforma)
    await this.notificationsService.notifyRoles(
      ['GERANT', 'RESPONSABLE_GENERAL', 'RESPONSABLE_FINANCIER_STOCKS'],
      {
        type: 'sales_order_created',
        title: 'Nouvelle commande client',
        message: `Commande ${created.orderNumber} - ${created.client?.name ?? 'Client'} (${totalTtc.toFixed(2)} EUR)`,
        data: {
          orderId: created.id,
          orderNumber: created.orderNumber,
          clientName: created.client?.name,
          totalTtc,
        },
        actionUrl: `/sales-orders/${created.id}`,
        priority: 'normal',
      },
    );

    return created;
  }

  update(id: string, dto: UpdateSalesOrderDto) {
    return this.prisma.$transaction(async (tx) => {
      const data: Prisma.SalesOrderUpdateInput = {
        ...(dto.clientId !== undefined ? { clientId: dto.clientId } : {}),
        ...(dto.orderType !== undefined ? { orderType: dto.orderType } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.taxRate !== undefined ? { taxRate: dto.taxRate } : {}),
        ...(dto.currency !== undefined ? { currency: dto.currency } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        ...(dto.batRequired !== undefined
          ? { batRequired: dto.batRequired }
          : {}),
      };

      if (dto.orderNumber !== undefined) {
        const parsed = this.documentReferenceService.parseReferenceNumber(
          SALES_ORDER_PREFIX,
          dto.orderNumber,
          'de commande',
        );
        data.orderNumber = parsed.number;
        data.referenceLevel = parsed.level;
      }
      if (dto.orderDate) {
        data.orderDate = new Date(dto.orderDate);
      }

      const updated = await tx.salesOrder.update({
        where: { id },
        data,
      });

      if (data.referenceLevel !== undefined && typeof data.referenceLevel === 'number') {
        const referenceLevel = data.referenceLevel;
        await tx.salesOrderItem.updateMany({
          where: { salesOrderId: id },
          data: { referenceLevel },
        });
        await tx.batDocument.updateMany({
          where: { salesOrderId: id },
          data: { referenceLevel },
        });
      }

      return updated;
    });
  }

  async updateStatus(id: string, dto: UpdateSalesOrderStatusDto, userId?: string) {
    const order = await this.prisma.salesOrder.findUnique({
      where: { id },
      select: { status: true, batRequired: true, batApprovedAt: true },
    });
    if (!order) {
      throw new NotFoundException('Commande introuvable');
    }

    const allowedTransitions = SALES_ORDER_STATUS_TRANSITIONS;
    const current = order.status;
    const next = dto.status;
    if (!allowedTransitions[current]?.includes(next)) {
      throw new BadRequestException(
        `Transition invalide: ${current} -> ${next}`,
      );
    }

    // Bloquer le lancement en production si le BAT est requis mais pas encore approuvé
    if (next === 'IN_PRODUCTION' && order.batRequired && !order.batApprovedAt) {
      throw new BadRequestException(
        'Le BAT (Bon à Tirer) doit être approuvé par le client avant de lancer la production.',
      );
    }

    const updated = await this.prisma.salesOrder.update({
      where: { id },
      data: { status: next },
    });

    if (userId) {
      await this.auditService.log({
        entityType: 'SalesOrder',
        entityId: id,
        action: 'SALES_ORDER_STATUS_CHANGED',
        userId,
        changes: { status: { before: current, after: next } },
      });
    }

    return updated;
  }

  async sendBat(id: string, userId?: string) {
    const order = await this.prisma.salesOrder.findUnique({
      where: { id },
      select: { batRequired: true, batSentAt: true },
    });
    if (!order) throw new NotFoundException('Commande introuvable');
    if (!order.batRequired) {
      throw new BadRequestException(
        'Cette commande ne nécessite pas de BAT (batRequired = false).',
      );
    }
    const updated = await this.prisma.salesOrder.update({
      where: { id },
      data: { batSentAt: new Date() },
    });

    if (userId) {
      await this.auditService.log({
        entityType: 'SalesOrder',
        entityId: id,
        action: 'SALES_ORDER_BAT_SENT',
        userId,
      });
    }

    return updated;
  }

  async approveBat(id: string, userId?: string) {
    const order = await this.prisma.salesOrder.findUnique({
      where: { id },
      select: { batRequired: true, batSentAt: true, batApprovedAt: true },
    });
    if (!order) throw new NotFoundException('Commande introuvable');
    if (!order.batRequired) {
      throw new BadRequestException(
        'Cette commande ne nécessite pas de BAT.',
      );
    }
    if (!order.batSentAt) {
      throw new BadRequestException(
        'Le BAT n\'a pas encore été envoyé au client. Utilisez d\'abord /bat-send.',
      );
    }
    if (order.batApprovedAt) {
      throw new BadRequestException('Le BAT a déjà été approuvé.');
    }
    const updated = await this.prisma.salesOrder.update({
      where: { id },
      data: { batApprovedAt: new Date() },
    });

    if (userId) {
      await this.auditService.log({
        entityType: 'SalesOrder',
        entityId: id,
        action: 'SALES_ORDER_BAT_APPROVED',
        userId,
      });
    }

    return updated;
  }

  remove(id: string) {
    return this.prisma.salesOrder.delete({ where: { id } });
  }

  private async ensureSalesOrderExists(salesOrderId: string) {
    const order = await this.prisma.salesOrder.findUnique({
      where: { id: salesOrderId },
      select: { id: true },
    });
    if (!order) {
      throw new NotFoundException('Commande introuvable');
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
