import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client';
import {
  ProductionStage,
  ProductionStatus,
} from '../generated/prisma/client';
import { ListQueryDto } from '../common/dto/list-query.dto';
import { enumWhere } from '../common/prisma/enum-filter.util';
import { buildFrenchTextSearchOr } from '../common/query/search.util';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit.service';
import { DocumentReferenceService } from '../common/document-reference/document-reference.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SalesOrdersService } from '../sales-orders/sales-orders.service';
import { CreateProductionOrderDto } from './dto/create-production-order.dto';
import { PlanningQueryDto } from './dto/planning-query.dto';
import { ProductionPlanningResponseDto } from './dto/production-planning-response.dto';
import { UpdateProductionProgressDto } from './dto/update-production-progress.dto';
import { UpdateProductionOrderDto } from './dto/update-production-order.dto';
import {
  UpsertProductionStagesDto,
} from './dto/upsert-production-stages.dto';

const PRODUCTION_ORDER_PREFIX = 'OF';

const PRODUCTION_STAGES_ORDERED: ProductionStage[] = [
  ProductionStage.PREPARATION,
  ProductionStage.CROCHET,
  ProductionStage.WEAVING,
  ProductionStage.LEATHER,
  ProductionStage.FINISHING,
  ProductionStage.QUALITY_CONTROL,
];

const PRODUCTION_STAGE_LABELS: Record<ProductionStage, string> = {
  PREPARATION: 'Préparation',
  CROCHET: 'Crochet',
  WEAVING: 'Tissage',
  LEATHER: 'Cuir',
  FINISHING: 'Finitions',
  QUALITY_CONTROL: 'Contrôle',
};

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
    const where: Prisma.ProductionOrderWhereInput = {
      ...enumWhere('status', query.status, ProductionStatus),
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

      const startDate = dto.startDate ? new Date(dto.startDate) : undefined;
      const endDate = dto.endDate ? new Date(dto.endDate) : undefined;
      const stageDates = this.distributeStageDates(
        startDate,
        endDate,
        PRODUCTION_STAGES_ORDERED.length,
      );

      const data: Prisma.ProductionOrderUncheckedCreateInput = {
        orderNumber,
        referenceLevel,
        productId: dto.productId,
        variantId: dto.variantId,
        salesOrderId: dto.salesOrderId,
        salesOrderItemId: dto.salesOrderItemId,
        quantity: dto.quantity,
        status: dto.status ?? ProductionStatus.PLANNED,
        startDate,
        endDate,
      };

      const created = await tx.productionOrder.create({ data });

      await tx.productionStep.createMany({
        data: PRODUCTION_STAGES_ORDERED.map((stage, index) => ({
          productionOrderId: created.id,
          referenceLevel,
          stage,
          plannedStart: stageDates[index]?.plannedStart,
          plannedEnd: stageDates[index]?.plannedEnd,
        })),
      });

      return tx.productionOrder.findUniqueOrThrow({
        where: { id: created.id },
        include: { stages: true, product: true, variant: true, salesOrder: true },
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

      const data: Prisma.ProductionOrderUpdateInput = {
        ...(dto.productId !== undefined ? { productId: dto.productId } : {}),
        ...(dto.variantId !== undefined ? { variantId: dto.variantId } : {}),
        ...(dto.salesOrderId !== undefined ? { salesOrderId: dto.salesOrderId } : {}),
        ...(dto.salesOrderItemId !== undefined
          ? { salesOrderItemId: dto.salesOrderItemId }
          : {}),
        ...(dto.quantity !== undefined ? { quantity: dto.quantity } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      };

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
        data.orderNumber = parsed.number;
        data.referenceLevel = parsed.level;
      }

      if (dto.startDate) {
        data.startDate = new Date(dto.startDate);
      }
      if (dto.endDate) {
        data.endDate = new Date(dto.endDate);
      }

      return tx.productionOrder.update({
        where: { id },
        data,
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

    if (
      existing.status === ProductionStatus.COMPLETED ||
      existing.status === ProductionStatus.CANCELLED
    ) {
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

    const nextStatus =
      dto.status ?? (clamped === 100 ? ProductionStatus.COMPLETED : undefined);

    if (nextStatus === ProductionStatus.COMPLETED && clamped < 100) {
      throw new BadRequestException(
        'Un OF ne peut etre COMPLETE qu avec 100% d avancement',
      );
    }

    const updateData: Prisma.ProductionOrderUpdateInput = {
      progress: clamped,
    };
    if (nextStatus) {
      updateData.status = nextStatus;
    }

    return this.prisma.productionOrder.update({
      where: { id },
      data: updateData,
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

  async getPlanning(query: PlanningQueryDto): Promise<ProductionPlanningResponseDto> {
    const { from, to } = this.resolvePlanningRange(query.from, query.to);
    const days = this.enumerateDays(from, to);

    const steps = await this.prisma.productionStep.findMany({
      where: {
        plannedStart: { not: null },
        plannedEnd: { not: null },
        productionOrder: {
          status: { not: ProductionStatus.CANCELLED },
        },
        AND: [
          { plannedStart: { lte: to } },
          { plannedEnd: { gte: from } },
        ],
      },
      select: {
        stage: true,
        plannedStart: true,
        plannedEnd: true,
      },
    });

    const loadByStage = new Map<ProductionStage, number[]>(
      PRODUCTION_STAGES_ORDERED.map((stage) => [
        stage,
        Array.from({ length: days.length }, () => 0),
      ]),
    );

    for (const step of steps) {
      const plannedStart = step.plannedStart;
      const plannedEnd = step.plannedEnd;
      if (!plannedStart || !plannedEnd) {
        continue;
      }

      const row = loadByStage.get(step.stage);
      if (!row) {
        continue;
      }

      for (let i = 0; i < days.length; i += 1) {
        const day = days[i];
        if (!day) {
          continue;
        }
        const dayStart = this.parseDateOnly(day);
        const dayEnd = this.parseDateOnly(day, true);
        if (!dayStart || !dayEnd) {
          continue;
        }
        if (plannedStart.getTime() <= dayEnd.getTime() && plannedEnd.getTime() >= dayStart.getTime()) {
          row[i] = (row[i] ?? 0) + 1;
        }
      }
    }

    return {
      from: this.toIsoDate(from),
      to: this.toIsoDate(to),
      days,
      rows: PRODUCTION_STAGES_ORDERED.map((stage) => ({
        stage,
        label: PRODUCTION_STAGE_LABELS[stage],
        load: loadByStage.get(stage) ?? Array.from({ length: days.length }, () => 0),
      })),
    };
  }

  async upsertStages(id: string, dto: UpsertProductionStagesDto) {
    const order = await this.prisma.productionOrder.findUnique({
      where: { id },
      select: { id: true, referenceLevel: true },
    });
    if (!order) {
      throw new NotFoundException('Ordre de fabrication introuvable');
    }

    const seen = new Set<string>();
    for (const item of dto.stages) {
      if (seen.has(item.stage)) {
        throw new BadRequestException(`Etape dupliquee: ${item.stage}`);
      }
      seen.add(item.stage);

      const plannedStart = item.plannedStart ? new Date(item.plannedStart) : undefined;
      const plannedEnd = item.plannedEnd ? new Date(item.plannedEnd) : undefined;
      if (plannedStart && plannedEnd && plannedStart.getTime() > plannedEnd.getTime()) {
        throw new BadRequestException(
          `Plage invalide pour ${item.stage}: plannedStart > plannedEnd`,
        );
      }
    }

    await this.prisma.$transaction(async (tx) => {
      for (const item of dto.stages) {
        const stage = item.stage as ProductionStage;
        await tx.productionStep.upsert({
          where: {
            productionOrderId_stage: {
              productionOrderId: id,
              stage,
            },
          },
          create: {
            productionOrderId: id,
            referenceLevel: order.referenceLevel ?? undefined,
            stage,
            plannedStart: item.plannedStart ? new Date(item.plannedStart) : undefined,
            plannedEnd: item.plannedEnd ? new Date(item.plannedEnd) : undefined,
            actualStart: item.actualStart ? new Date(item.actualStart) : undefined,
            actualEnd: item.actualEnd ? new Date(item.actualEnd) : undefined,
            progress: item.progress ?? 0,
          },
          update: {
            ...(item.plannedStart !== undefined
              ? { plannedStart: item.plannedStart ? new Date(item.plannedStart) : null }
              : {}),
            ...(item.plannedEnd !== undefined
              ? { plannedEnd: item.plannedEnd ? new Date(item.plannedEnd) : null }
              : {}),
            ...(item.actualStart !== undefined
              ? { actualStart: item.actualStart ? new Date(item.actualStart) : null }
              : {}),
            ...(item.actualEnd !== undefined
              ? { actualEnd: item.actualEnd ? new Date(item.actualEnd) : null }
              : {}),
            ...(item.progress !== undefined ? { progress: item.progress } : {}),
          },
        });
      }
    });

    return this.findOne(id);
  }

  async approveQuality(id: string, userId?: string) {
    const order = await this.prisma.productionOrder.findUnique({
      where: { id },
      select: { status: true, qualityApproved: true },
    });
    if (!order) {
      throw new NotFoundException('Ordre de fabrication introuvable');
    }
    if (order.status !== ProductionStatus.COMPLETED) {
      throw new BadRequestException(
        'La validation qualité n\'est possible que sur un OF terminé (COMPLETED)',
      );
    }
    if (order.qualityApproved) {
      throw new BadRequestException('Cet OF a déjà été validé en qualité');
    }
    const updated = await this.prisma.productionOrder.update({
      where: { id },
      data: { qualityApproved: true },
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

  private distributeStageDates(
    start: Date | undefined,
    end: Date | undefined,
    stageCount: number,
  ): Array<{ plannedStart: Date | undefined; plannedEnd: Date | undefined }> {
    if (!start || !end || end.getTime() <= start.getTime() || stageCount <= 0) {
      return Array.from({ length: stageCount }, () => ({
        plannedStart: undefined,
        plannedEnd: undefined,
      }));
    }

    const totalMs = end.getTime() - start.getTime();
    const segmentMs = totalMs / stageCount;

    return Array.from({ length: stageCount }, (_, index) => {
      const plannedStart = new Date(start.getTime() + index * segmentMs);
      const plannedEnd = new Date(start.getTime() + (index + 1) * segmentMs);
      return { plannedStart, plannedEnd };
    });
  }

  private resolvePlanningRange(fromRaw?: string, toRaw?: string): {
    from: Date;
    to: Date;
  } {
    const now = new Date();
    const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1);
    const defaultTo = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );

    const from = this.parseDateOnly(fromRaw) ?? defaultFrom;
    const to = this.parseDateOnly(toRaw, true) ?? defaultTo;

    if (from.getTime() > to.getTime()) {
      throw new BadRequestException('from doit etre <= to');
    }

    return { from, to };
  }

  private enumerateDays(from: Date, to: Date): string[] {
    const days: string[] = [];
    const cursor = new Date(from);
    cursor.setHours(0, 0, 0, 0);

    const end = new Date(to);
    end.setHours(0, 0, 0, 0);

    while (cursor.getTime() <= end.getTime()) {
      days.push(this.toIsoDate(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }

    return days;
  }

  private parseDateOnly(raw?: string, endOfDay: boolean = false): Date | null {
    if (!raw?.trim()) {
      return null;
    }

    const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw.trim());
    if (dateOnlyMatch) {
      const year = Number(dateOnlyMatch[1]);
      const month = Number(dateOnlyMatch[2]) - 1;
      const day = Number(dateOnlyMatch[3]);
      const date = new Date(year, month, day);
      if (Number.isNaN(date.getTime())) {
        return null;
      }
      if (endOfDay) {
        date.setHours(23, 59, 59, 999);
      }
      return date;
    }

    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) {
      return null;
    }

    if (endOfDay) {
      date.setHours(23, 59, 59, 999);
    } else {
      date.setHours(0, 0, 0, 0);
    }

    return date;
  }

  private toIsoDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
