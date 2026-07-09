import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ListQueryDto } from '../common/dto/list-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateSalesOrderDto } from './dto/create-sales-order.dto';
import { UpdateSalesOrderStatusDto } from './dto/update-sales-order-status.dto';
import { UpdateSalesOrderDto } from './dto/update-sales-order.dto';

@Injectable()
export class SalesOrdersService {
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
      ...(query.type ? { orderType: query.type as any } : {}),
      ...(query.q
        ? {
            OR: [
              { orderNumber: { contains: query.q } },
              { client: { is: { name: { contains: query.q } } } },
            ],
          }
        : {}),
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
      },
    });
  }

  async create(dto: CreateSalesOrderDto, userId?: string) {
    const taxRate = dto.taxRate ?? 20;
    const items = dto.items ?? [];
    const totalHt = items.reduce(
      (sum, item) => sum + item.quantity * item.unitPriceHt,
      0,
    );
    const totalTtc = totalHt * (1 + taxRate / 100);

    const created = await this.prisma.salesOrder.create({
      data: {
        orderNumber: dto.orderNumber,
        clientId: dto.clientId,
        orderType: dto.orderType as any,
        status: (dto.status ?? 'TO_PROCESS') as any,
        orderDate: new Date(dto.orderDate),
        taxRate,
        totalHt,
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
              taxRate: item.taxRate ?? taxRate,
              lineTotalHt,
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
        entityType: 'SalesOrder',
        entityId: created.id,
        action: 'SALES_ORDER_CREATED',
        userId,
        changes: {
          orderNumber: { after: dto.orderNumber },
          status: { after: dto.status ?? 'TO_PROCESS' },
          totalTtc: { after: totalTtc },
        },
      });
    }

    // Notifier les rôles concernés
    await this.notificationsService.notifyRoles(
      ['GERANT', 'RESPONSABLE_GENERAL'],
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
    const payload: Record<string, unknown> = { ...dto };
    if (dto.orderDate) {
      payload.orderDate = new Date(dto.orderDate);
    }

    return this.prisma.salesOrder.update({
      where: { id },
      data: payload as any,
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

    const allowedTransitions: Record<string, string[]> = {
      QUOTE: ['TO_PROCESS', 'CANCELLED'],
      TO_PROCESS: ['IN_PRODUCTION', 'PREPARING', 'CANCELLED'],
      IN_PRODUCTION: ['PREPARING', 'SHIPPED', 'CANCELLED'],
      PREPARING: ['SHIPPED', 'CANCELLED'],
      SHIPPED: ['DELIVERED', 'CANCELLED'],
      DELIVERED: ['INVOICED'],
      INVOICED: [],
      CANCELLED: [],
    };

    const current = order.status as unknown as string;
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
      data: { status: next as any },
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
      data: { batSentAt: new Date() } as any,
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
      data: { batApprovedAt: new Date() } as any,
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
}
