import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ListQueryDto } from '../common/dto/list-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateProductionOrderDto } from './dto/create-production-order.dto';
import { UpdateProductionProgressDto } from './dto/update-production-progress.dto';
import { UpdateProductionOrderDto } from './dto/update-production-order.dto';

@Injectable()
export class ProductionOrdersService {
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
      ...(query.q
        ? {
            OR: [
              { orderNumber: { contains: query.q } },
              { product: { is: { name: { contains: query.q } } } },
            ],
          }
        : {}),
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
    const payload: Record<string, unknown> = { ...dto };
    if (dto.startDate) {
      payload.startDate = new Date(dto.startDate);
    }
    if (dto.endDate) {
      payload.endDate = new Date(dto.endDate);
    }

    const created = await this.prisma.productionOrder.create({
      data: payload as any,
    });

    // Passer la commande client en IN_PRODUCTION automatiquement
    if (dto.salesOrderId) {
      await this.prisma.salesOrder.update({
        where: { id: dto.salesOrderId },
        data: { status: 'IN_PRODUCTION' } as any,
      }).catch(() => { /* commande inexistante ou déjà dans un statut terminal */ });
    }

    if (userId) {
      await this.auditService.log({
        entityType: 'ProductionOrder',
        entityId: created.id,
        action: 'PRODUCTION_ORDER_CREATED',
        userId,
        changes: {
          orderNumber: { after: dto.orderNumber },
          quantity: { after: dto.quantity },
          status: { after: dto.status ?? 'PLANNED' },
        },
      });
    }

    return created;
  }

  update(id: string, dto: UpdateProductionOrderDto) {
    const payload: Record<string, unknown> = { ...dto };
    if (dto.startDate) {
      payload.startDate = new Date(dto.startDate);
    }
    if (dto.endDate) {
      payload.endDate = new Date(dto.endDate);
    }

    return this.prisma.productionOrder.update({
      where: { id },
      data: payload as any,
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
