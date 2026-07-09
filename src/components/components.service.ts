import { BadRequestException, Injectable } from '@nestjs/common';
import { ListQueryDto } from '../common/dto/list-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateComponentDto } from './dto/create-component.dto';
import { UpdateComponentDto } from './dto/update-component.dto';

@Injectable()
export class ComponentsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(query: ListQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = {
      ...(query.q
        ? {
            OR: [
              { ref: { contains: query.q } },
              { name: { contains: query.q } },
            ],
          }
        : {}),
    };

    return this.prisma.$transaction(async (tx) => {
      const [items, total] = await Promise.all([
        tx.component.findMany({
          where,
          include: { supplier: true },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        tx.component.count({ where }),
      ]);

      return { items, total, page, pageSize };
    });
  }

  findOne(id: string) {
    return this.prisma.component.findUnique({
      where: { id },
      include: { supplier: true },
    });
  }

  create(dto: CreateComponentDto) {
    const origin = dto.origin ?? 'PURCHASED';
    if (origin === 'PURCHASED' && !dto.supplierId) {
      throw new BadRequestException(
        'supplierId est requis pour un composant de type PURCHASED (acheté à un fournisseur).',
      );
    }
    return this.prisma.component.create({ data: dto as any });
  }

  update(id: string, dto: UpdateComponentDto) {
    if (dto.origin === 'PURCHASED' && dto.supplierId === null) {
      throw new BadRequestException(
        'supplierId ne peut pas être null pour un composant de type PURCHASED.',
      );
    }
    return this.prisma.component.update({ where: { id }, data: dto as any });
  }

  remove(id: string) {
    return this.prisma.component.delete({ where: { id } });
  }
}
