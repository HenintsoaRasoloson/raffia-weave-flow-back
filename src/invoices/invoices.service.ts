import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ListQueryDto } from '../common/dto/list-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

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
      include: { client: true, salesOrder: true, items: true },
    });
  }

  async create(dto: CreateInvoiceDto) {
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

    return this.prisma.invoice.create({
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
      select: { status: true, type: true },
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
      } as any,
    });
  }

  remove(id: string) {
    return this.prisma.invoice.delete({ where: { id } });
  }
}
