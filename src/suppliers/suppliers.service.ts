import { Injectable } from '@nestjs/common';
import { ListQueryDto } from '../common/dto/list-query.dto';
import { buildFrenchTableTextWhere } from '../common/query/search.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ListQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const textWhere = await buildFrenchTableTextWhere(
      this.prisma,
      'Supplier',
      ['name', 'email', 'category'],
      query.q,
    );
    const where = {
      ...textWhere,
    };

    return this.prisma.$transaction(async (tx) => {
      const [items, total] = await Promise.all([
        tx.supplier.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        tx.supplier.count({ where }),
      ]);

      return { items, total, page, pageSize };
    });
  }

  findOne(id: string) {
    return this.prisma.supplier.findUnique({ where: { id } });
  }

  create(dto: CreateSupplierDto) {
    return this.prisma.supplier.create({
      data: {
        name: dto.name,
        country: dto.country,
        category: dto.category,
        email: dto.email,
        phone: dto.phone,
        leadTimeDays: dto.leadTimeDays,
        qualityRating: dto.qualityRating,
      },
    });
  }

  update(id: string, dto: UpdateSupplierDto) {
    return this.prisma.supplier.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.country !== undefined ? { country: dto.country } : {}),
        ...(dto.category !== undefined ? { category: dto.category } : {}),
        ...(dto.email !== undefined ? { email: dto.email } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(dto.leadTimeDays !== undefined ? { leadTimeDays: dto.leadTimeDays } : {}),
        ...(dto.qualityRating !== undefined
          ? { qualityRating: dto.qualityRating }
          : {}),
      },
    });
  }

  remove(id: string) {
    return this.prisma.supplier.delete({ where: { id } });
  }
}
