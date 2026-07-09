import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ListQueryDto } from '../common/dto/list-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { UpdateDeliveryDto } from './dto/update-delivery.dto';

const BUSINESS_DOC_SCOPE = 'business-documents';
const BUSINESS_DOC_LEVEL_LENGTH = 6;
const DELIVERY_PREFIX = 'LIV';

@Injectable()
export class DeliveriesService {
  constructor(
    private readonly prisma: PrismaService,
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
              { deliveryNumber: { contains: query.q } },
              { carrier: { contains: query.q } },
              { trackingCode: { contains: query.q } },
              { client: { is: { name: { contains: query.q } } } },
            ],
          }
        : {}),
    };

    return this.prisma.$transaction(async (tx) => {
      const [items, total] = await Promise.all([
        tx.delivery.findMany({
          where,
          include: { client: true, salesOrder: true },
          orderBy: { createdAt: 'desc' },
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

  create(dto: CreateDeliveryDto) {
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
        referenceLevel = await this.allocateNextReferenceLevel(tx as any);
        await tx.salesOrder.update({
          where: { id: salesOrder.id },
          data: { referenceLevel },
        });
      }

      let deliveryNumber: string;
      if (dto.deliveryNumber?.trim()) {
        const parsed = this.parseDeliveryNumber(dto.deliveryNumber);
        if (parsed.level !== referenceLevel) {
          throw new BadRequestException(
            `Reference livraison invalide: le niveau ${parsed.level} doit correspondre au niveau commande ${referenceLevel}`,
          );
        }
        deliveryNumber = parsed.number;
      } else {
        deliveryNumber = this.buildDeliveryNumber(referenceLevel);
      }

      const payload: Record<string, unknown> = {
        ...dto,
        deliveryNumber,
        referenceLevel,
      };
      if (dto.eta) {
        payload.eta = new Date(dto.eta);
      }

      return tx.delivery.create({
        data: payload as any,
      });
    });
  }

  update(id: string, dto: UpdateDeliveryDto) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.delivery.findUnique({
        where: { id },
        select: { id: true, referenceLevel: true, salesOrderId: true },
      });
      if (!current) {
        throw new NotFoundException('Livraison introuvable');
      }

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

      const payload: Record<string, unknown> = { ...dto };
      if (dto.deliveryNumber !== undefined) {
        const parsed = this.parseDeliveryNumber(dto.deliveryNumber);
        if (parsed.level !== salesOrder.referenceLevel) {
          throw new BadRequestException(
            `Reference livraison invalide: le niveau ${parsed.level} doit correspondre au niveau commande ${salesOrder.referenceLevel}`,
          );
        }
        payload.deliveryNumber = parsed.number;
        payload.referenceLevel = parsed.level;
      }

      if (dto.eta) {
        payload.eta = new Date(dto.eta);
      }

      return tx.delivery.update({
        where: { id },
        data: payload as any,
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

    const allowedSourceStatuses = ['PREPARING', 'IN_TRANSIT'];
    const current = delivery.status as unknown as string;
    if (!allowedSourceStatuses.includes(current)) {
      throw new BadRequestException(
        `Transition invalide: ${current} -> DELIVERED`,
      );
    }

    const updated = await this.prisma.delivery.update({
      where: { id },
      data: {
        status: 'DELIVERED',
        deliveredAt: new Date(),
      } as any,
      include: { salesOrder: true, client: true },
    });

    // Passer la commande client en DELIVERED automatiquement
    if (delivery.salesOrderId) {
      await this.prisma.salesOrder.update({
        where: { id: delivery.salesOrderId },
        data: { status: 'DELIVERED' } as any,
      }).catch(() => { /* commande déjà dans un statut terminal */ });
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

  private buildDeliveryNumber(level: number) {
    return `${DELIVERY_PREFIX}/${level
      .toString()
      .padStart(BUSINESS_DOC_LEVEL_LENGTH, '0')}`;
  }

  private parseDeliveryNumber(rawDeliveryNumber: string) {
    const normalized = rawDeliveryNumber.trim().toUpperCase();
    const regex = new RegExp(
      `^${DELIVERY_PREFIX}\\/(\\d{${BUSINESS_DOC_LEVEL_LENGTH}})$`,
    );
    const match = normalized.match(regex);
    if (!match) {
      throw new BadRequestException(
        `Format de livraison invalide. Attendu: ${DELIVERY_PREFIX}/${'0'.repeat(BUSINESS_DOC_LEVEL_LENGTH)}`,
      );
    }

    return {
      number: normalized,
      level: Number(match[1]),
    };
  }

  private async allocateNextReferenceLevel(tx: any) {
    const sequence = await tx.documentSequence.upsert({
      where: { scope: BUSINESS_DOC_SCOPE },
      update: { nextValue: { increment: 1 } },
      create: { scope: BUSINESS_DOC_SCOPE, nextValue: 2 },
      select: { nextValue: true },
    });

    return sequence.nextValue - 1;
  }
}
