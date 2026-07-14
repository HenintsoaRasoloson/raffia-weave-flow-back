import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ListQueryDto } from '../common/dto/list-query.dto';
import { buildFrenchTextSearchOr } from '../common/query/search.util';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit.service';
import { DocumentReferenceService } from '../common/document-reference/document-reference.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SalesOrdersService } from '../sales-orders/sales-orders.service';
import { CreateProductionOrderDto } from './dto/create-production-order.dto';
import { UpdateProductionProgressDto } from './dto/update-production-progress.dto';
import { UpdateProductionOrderDto } from './dto/update-production-order.dto';

const PRODUCTION_ORDER_PREFIX = 'OF';

@Injectable()
export class ProductionOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
    private readonly documentReferenceService: DocumentReferenceService,
    private readonly salesOrdersService: SalesOrdersService,
  ) {}

  async findAll(query: ListQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const textOr = await buildFrenchTextSearchOr(this.prisma, {
      term: query.q,
      scalarFields: ['orderNumber'],
      relations: [{ table: 'Product', columns: ['name'], foreignKey: 'productId' }],
    });
    const where = {
      ...(query.status ? { status: query.status as any } : {}),
      ...(textOr ? { OR: textOr } : {}),
    };

    return this.prisma.$transaction(async (tx) => {
      const [items, total] = await Promise.all([
        tx.productionOrder.findMany({
          where,
          include: { product: true, variant: true, salesOrder: true },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        tx.productionOrder.count({ where }),
      ]);

      return { items, total, page, pageSize };
    });
  }

  findOne(id: string) {
    return this.prisma.productionOrder.findUnique({
      where: { id },
      include: {
        product: true,
        variant: true,
        salesOrder: true,
        salesOrderItem: true,
        stages: true,
      },
    });
  }

  async create(dto: CreateProductionOrderDto, userId?: string) {
    const created = await this.prisma.$transaction(async (tx) => {
      let linkedOrderLevel: number | null = null;
      if (dto.salesOrderId) {
        const salesOrder = await tx.salesOrder.findUnique({
          where: { id: dto.salesOrderId },
          select: { id: true, referenceLevel: true },
        });
        if (!salesOrder) {
          throw new NotFoundException('Commande liee introuvable');
        }

        linkedOrderLevel = salesOrder.referenceLevel;
        if (linkedOrderLevel === null) {
          linkedOrderLevel = await this.documentReferenceService.allocateNextReferenceLevel(tx);
          await tx.salesOrder.update({
            where: { id: salesOrder.id },
            data: { referenceLevel: linkedOrderLevel },
          });
        }
      }

      let orderNumber: string;
      let referenceLevel: number;
      if (dto.orderNumber?.trim()) {
        const parsed = this.documentReferenceService.parseReferenceNumber(
          PRODUCTION_ORDER_PREFIX,
          dto.orderNumber,
          'OF',
        );
        if (linkedOrderLevel !== null && parsed.level !== linkedOrderLevel) {
          throw new BadRequestException(
            `Reference OF invalide: le niveau ${parsed.level} doit correspondre au niveau commande ${linkedOrderLevel}`,
          );
        }
        orderNumber = parsed.number;
        referenceLevel = parsed.level;
      } else {
        referenceLevel =
          linkedOrderLevel ?? (await this.documentReferenceService.allocateNextReferenceLevel(tx));
        orderNumber = this.documentReferenceService.buildReferenceNumber(
          PRODUCTION_ORDER_PREFIX,
          referenceLevel,
        );
      }

      const payload: Record<string, unknown> = {
        ...dto,
        orderNumber,
        referenceLevel,
      };
      if (dto.startDate) {
        payload.startDate = new Date(dto.startDate);
      }
      if (dto.endDate) {
        payload.endDate = new Date(dto.endDate);
      }

      return tx.productionOrder.create({
        data: payload as any,
      });
    });

    // Passer la commande client en IN_PRODUCTION automatiquement
    if (dto.salesOrderId) {
      await this.salesOrdersService
        .updateStatus(dto.salesOrderId, { status: 'IN_PRODUCTION' }, userId)
        .catch(() => undefined);
    }

    if (userId) {
      await this.auditService.log({
        entityType: 'ProductionOrder',
        entityId: created.id,
        action: 'PRODUCTION_ORDER_CREATED',
        userId,
        changes: {
          orderNumber: { after: created.orderNumber },
          quantity: { after: dto.quantity },
          status: { after: dto.status ?? 'PLANNED' },
        },
      });
    }

    return created;
  }

  update(id: string, dto: UpdateProductionOrderDto) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.productionOrder.findUnique({
        where: { id },
        select: { id: true, salesOrderId: true },
      });
      if (!current) {
        throw new NotFoundException('Ordre de fabrication introuvable');
      }

      const targetSalesOrderId = dto.salesOrderId ?? current.salesOrderId;
      let linkedOrderLevel: number | null = null;
      if (targetSalesOrderId) {
        const salesOrder = await tx.salesOrder.findUnique({
          where: { id: targetSalesOrderId },
          select: { referenceLevel: true },
        });
        linkedOrderLevel = salesOrder?.referenceLevel ?? null;
      }

      const payload: Record<string, unknown> = { ...dto };
      if (dto.orderNumber !== undefined) {
        const parsed = this.documentReferenceService.parseReferenceNumber(
          PRODUCTION_ORDER_PREFIX,
          dto.orderNumber,
          'OF',
        );
        if (linkedOrderLevel !== null && parsed.level !== linkedOrderLevel) {
          throw new BadRequestException(
            `Reference OF invalide: le niveau ${parsed.level} doit correspondre au niveau commande ${linkedOrderLevel}`,
          );
        }
        payload.orderNumber = parsed.number;
        payload.referenceLevel = parsed.level;
      }

      if (dto.startDate) {
        payload.startDate = new Date(dto.startDate);
      }
      if (dto.endDate) {
        payload.endDate = new Date(dto.endDate);
      }

      return tx.productionOrder.update({
        where: { id },
        data: payload as any,
      });
    });
  }

  async updateProgress(id: string, dto: UpdateProductionProgressDto) {
    const existing = await this.prisma.productionOrder.findUnique({
      where: { id },
      select: { status: true, progress: true },
    });
    if (!existing) {
      throw new NotFoundException('Ordre de fabrication introuvable');
    }

    if (existing.status === 'COMPLETED' || existing.status === 'CANCELLED') {
      throw new BadRequestException(
        `OF verrouille: statut ${existing.status} non modifiable`,
      );
    }

    const clamped = Math.max(0, Math.min(100, dto.progress));
    if (clamped < existing.progress) {
      throw new BadRequestException(
        'La progression ne peut pas diminuer',
      );
    }

    const nextStatus = dto.status ?? (clamped === 100 ? 'COMPLETED' : undefined);

    if (nextStatus === 'COMPLETED' && clamped < 100) {
      throw new BadRequestException(
        'Un OF ne peut etre COMPLETE qu avec 100% d avancement',
      );
    }

    return this.prisma.productionOrder.update({
      where: { id },
      data: {
        progress: clamped,
        ...(nextStatus ? { status: nextStatus as any } : {}),
      } as any,
    });
  }

  remove(id: string) {
    return this.prisma.productionOrder.delete({ where: { id } });
  }

  async checkMaterials(id: string) {
    const order = await this.prisma.productionOrder.findUnique({
      where: { id },
      select: {
        quantity: true,
        product: {
          select: {
            name: true,
            bomItems: {
              include: { component: true },
            },
          },
        },
      },
    });
    if (!order) {
      throw new NotFoundException('Ordre de fabrication introuvable');
    }

    const results = order.product.bomItems.map((bom) => {
      const needed = Number(bom.quantity) * order.quantity;
      const available = Number(bom.component.stockQty);
      const missing = Math.max(0, needed - available);
      return {
        componentId: bom.component.id,
        componentRef: bom.component.ref,
        componentName: bom.component.name,
        unit: bom.component.unit,
        origin: bom.component.origin,
        needed,
        available,
        missing,
        ok: missing === 0,
      };
    });

    return {
      productionOrderId: id,
      productName: order.product.name,
      quantity: order.quantity,
      ready: results.every((r) => r.ok),
      items: results,
    };
  }

  async approveQuality(id: string, userId?: string) {
    const order = await this.prisma.productionOrder.findUnique({
      where: { id },
      select: { status: true, qualityApproved: true },
    });
    if (!order) {
      throw new NotFoundException('Ordre de fabrication introuvable');
    }
    if ((order.status as unknown as string) !== 'COMPLETED') {
      throw new BadRequestException(
        'La validation qualité n\'est possible que sur un OF terminé (COMPLETED)',
      );
    }
    if (order.qualityApproved) {
      throw new BadRequestException('Cet OF a déjà été validé en qualité');
    }
    const updated = await this.prisma.productionOrder.update({
      where: { id },
      data: { qualityApproved: true } as any,
    });

    if (userId) {
      await this.auditService.log({
        entityType: 'ProductionOrder',
        entityId: id,
        action: 'PRODUCTION_ORDER_QUALITY_APPROVED',
        userId,
        changes: { qualityApproved: { before: false, after: true } },
      });
    }

    // Notifier que le produit est prêt pour livraison
    await this.notificationsService.notifyRole('RESPONSABLE_LIVRAISON', {
      type: 'production_ready_for_delivery',
      title: '✅ Produit prêt pour livraison',
      message: `OF #${updated.orderNumber} - Validation qualité effectuée`,
      data: {
        productionOrderId: id,
        orderNumber: updated.orderNumber,
      },
      actionUrl: `/production-orders/${id}`,
      priority: 'normal',
    });

    // Notifier aussi le gérant
    await this.notificationsService.notifyRole('GERANT', {
      type: 'production_completed',
      title: '🎉 Production terminée et validée',
      message: `OF #${updated.orderNumber}`,
      data: { productionOrderId: id },
      actionUrl: `/production-orders/${id}`,
    })
      .catch((err) => console.error('Notification error:', err));

    return updated;
  }
}
