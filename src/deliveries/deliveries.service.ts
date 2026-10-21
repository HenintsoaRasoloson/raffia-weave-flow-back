import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client';
import { DeliveryStatus } from '../generated/prisma/client';
import { ListQueryDto } from '../common/dto/list-query.dto';
import { enumWhere } from '../common/prisma/enum-filter.util';
import { dateFieldWhere, optionalEquals } from '../common/query/date-range.util';
import { buildFrenchTextSearchOr } from '../common/query/search.util';
import { resolveOrderBy } from '../common/query/sort.util';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentReferenceService } from '../common/document-reference/document-reference.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SalesOrdersService } from '../sales-orders/sales-orders.service';
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { UpdateDeliveryDto } from './dto/update-delivery.dto';

const DELIVERY_PREFIX = 'LIV';
const DELIVERY_SORT_FIELDS = ['createdAt', 'eta', 'deliveredAt', 'deliveryNumber'] as const;
const SHIPPING_STATUSES: DeliveryStatus[] = [
  DeliveryStatus.IN_TRANSIT,
  DeliveryStatus.DELIVERED,
];

@Injectable()
export class DeliveriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly documentReferenceService: DocumentReferenceService,
    private readonly salesOrdersService: SalesOrdersService,
  ) {}

  async findAll(query: ListQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const textOr = await buildFrenchTextSearchOr(this.prisma, {
      term: query.q,
      scalarFields: ['deliveryNumber', 'carrier', 'trackingCode'],
      relations: [{ table: 'Client', columns: ['name'], foreignKey: 'clientId' }],
    });
    const where: Prisma.DeliveryWhereInput = {
      ...enumWhere('status', query.status, DeliveryStatus),
      ...optionalEquals('clientId', query.clientId),
      ...optionalEquals('salesOrderId', query.salesOrderId),
      ...dateFieldWhere('createdAt', query.dateFrom, query.dateTo),
      ...(textOr ? { OR: textOr } : {}),
    };

    return this.prisma.$transaction(async (tx) => {
      const [items, total] = await Promise.all([
        tx.delivery.findMany({
          where,
          include: { client: true, salesOrder: true },
          orderBy: resolveOrderBy(query, DELIVERY_SORT_FIELDS, 'createdAt'),
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        tx.delivery.count({ where }),
      ]);

      return { items, total, page, pageSize };
    });
  }

  findOne(id: string) {
    return this.prisma.delivery.findUnique({
      where: { id },
      include: { client: true, salesOrder: true },
    });
  }

  async create(dto: CreateDeliveryDto) {
    if (dto.status && SHIPPING_STATUSES.includes(dto.status)) {
      await this.assertQualityApprovedForShipment(dto.salesOrderId);
    }

    return this.prisma.$transaction(async (tx) => {
      const salesOrder = await tx.salesOrder.findUnique({
        where: { id: dto.salesOrderId },
        select: { id: true, referenceLevel: true },
      });

      if (!salesOrder) {
        throw new NotFoundException('Commande liee introuvable');
      }

      let referenceLevel = salesOrder.referenceLevel;
      if (referenceLevel === null) {
        referenceLevel = await this.documentReferenceService.allocateNextReferenceLevel(tx);
        await tx.salesOrder.update({
          where: { id: salesOrder.id },
          data: { referenceLevel },
        });
      }

      let deliveryNumber: string;
      if (dto.deliveryNumber?.trim()) {
        const parsed = this.documentReferenceService.parseReferenceNumber(
          DELIVERY_PREFIX,
          dto.deliveryNumber,
          'de livraison',
        );
        if (parsed.level !== referenceLevel) {
          throw new BadRequestException(
            `Reference livraison invalide: le niveau ${parsed.level} doit correspondre au niveau commande ${referenceLevel}`,
          );
        }
        deliveryNumber = parsed.number;
      } else {
        deliveryNumber = this.documentReferenceService.buildReferenceNumber(
          DELIVERY_PREFIX,
          referenceLevel,
        );
      }

      const data: Prisma.DeliveryUncheckedCreateInput = {
        deliveryNumber,
        referenceLevel,
        salesOrderId: dto.salesOrderId,
        clientId: dto.clientId,
        carrier: dto.carrier,
        trackingCode: dto.trackingCode,
        status: dto.status ?? DeliveryStatus.PLANNED,
        notes: dto.notes,
        eta: dto.eta ? new Date(dto.eta) : undefined,
      };

      return tx.delivery.create({ data });
    });
  }

  async update(id: string, dto: UpdateDeliveryDto) {
    const current = await this.prisma.delivery.findUnique({
      where: { id },
      select: { id: true, referenceLevel: true, salesOrderId: true },
    });
    if (!current) {
      throw new NotFoundException('Livraison introuvable');
    }

    if (dto.status && SHIPPING_STATUSES.includes(dto.status)) {
      await this.assertQualityApprovedForShipment(
        dto.salesOrderId ?? current.salesOrderId,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const targetSalesOrderId = dto.salesOrderId ?? current.salesOrderId;
      const salesOrder = await tx.salesOrder.findUnique({
        where: { id: targetSalesOrderId },
        select: { referenceLevel: true },
      });
      if (!salesOrder || salesOrder.referenceLevel === null) {
        throw new BadRequestException(
          'Impossible de mettre a jour la livraison: reference de commande absente',
        );
      }

      const data: Prisma.DeliveryUpdateInput = {
        ...(dto.salesOrderId !== undefined ? { salesOrderId: dto.salesOrderId } : {}),
        ...(dto.clientId !== undefined ? { clientId: dto.clientId } : {}),
        ...(dto.carrier !== undefined ? { carrier: dto.carrier } : {}),
        ...(dto.trackingCode !== undefined ? { trackingCode: dto.trackingCode } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      };

      if (dto.deliveryNumber !== undefined) {
        const parsed = this.documentReferenceService.parseReferenceNumber(
          DELIVERY_PREFIX,
          dto.deliveryNumber,
          'de livraison',
        );
        if (parsed.level !== salesOrder.referenceLevel) {
          throw new BadRequestException(
            `Reference livraison invalide: le niveau ${parsed.level} doit correspondre au niveau commande ${salesOrder.referenceLevel}`,
          );
        }
        data.deliveryNumber = parsed.number;
        data.referenceLevel = parsed.level;
      }

      if (dto.eta) {
        data.eta = new Date(dto.eta);
      }

      return tx.delivery.update({
        where: { id },
        data,
      });
    });
  }

  async markDelivered(id: string) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id },
      include: { salesOrder: true, client: true },
    });
    if (!delivery) {
      throw new NotFoundException('Livraison introuvable');
    }

    await this.assertQualityApprovedForShipment(delivery.salesOrderId);

    const allowedSourceStatuses: DeliveryStatus[] = [
      DeliveryStatus.PLANNED,
      DeliveryStatus.PREPARING,
      DeliveryStatus.IN_TRANSIT,
    ];
    const current = delivery.status;
    if (!allowedSourceStatuses.includes(current)) {
      throw new BadRequestException(
        `Transition invalide: ${current} -> DELIVERED`,
      );
    }

    const updated = await this.prisma.delivery.update({
      where: { id },
      data: {
        status: DeliveryStatus.DELIVERED,
        deliveredAt: new Date(),
      },
      include: { salesOrder: true, client: true },
    });

    // Passer la commande client en DELIVERED automatiquement
    if (delivery.salesOrderId) {
      await this.salesOrdersService
        .updateStatus(delivery.salesOrderId, { status: 'DELIVERED' })
        .catch(() => undefined);
    }

    // Notifier tous les rôles concernés
    await this.notificationsService.notifyRoles(
      ['GERANT', 'RESPONSABLE_GENERAL', 'RESPONSABLE_LIVRAISON'],
      {
        type: 'delivery_completed',
        title: '🚚 Livraison effectuée',
        message: `Client: ${delivery.client?.name ?? 'Inconnu'} - ${delivery.deliveryNumber}`,
        data: {
          deliveryId: id,
          deliveryNumber: delivery.deliveryNumber,
          clientId: delivery.clientId,
          clientName: delivery.client?.name,
        },
        actionUrl: `/deliveries/${id}`,
        priority: 'normal',
      },
    )
      .catch((err) => console.error('Notification error:', err));

    return updated;
  }

  remove(id: string) {
    return this.prisma.delivery.delete({ where: { id } });
  }

  private async assertQualityApprovedForShipment(salesOrderId: string) {
    const pending = await this.prisma.productionOrder.findMany({
      where: {
        salesOrderId,
        status: { not: 'CANCELLED' },
        qualityApproved: false,
      },
      select: { orderNumber: true },
    });
    if (pending.length === 0) {
      return;
    }

    throw new BadRequestException(
      `Contrôle qualité requis avant expédition (${pending
        .map((order) => order.orderNumber)
        .join(', ')}). Validez la qualité sur l'ordre de fabrication.`,
    );
  }
}

