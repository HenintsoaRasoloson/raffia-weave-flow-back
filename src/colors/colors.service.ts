import { Injectable, NotFoundException } from '@nestjs/common';
import { ListQueryDto } from '../common/dto/list-query.dto';
import { buildFrenchTableTextWhere } from '../common/query/search.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateColorDto } from './dto/create-color.dto';
import { UpdateColorDto } from './dto/update-color.dto';

@Injectable()
export class ColorsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ListQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const textWhere = await buildFrenchTableTextWhere(
      this.prisma,
      'Color',
      ['name', 'hex'],
      query.q,
    );
    const where = {
      ...textWhere,
    };

    return this.prisma.$transaction(async (tx) => {
      const [items, total] = await Promise.all([
        tx.color.findMany({
          where,
          orderBy: { name: 'asc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        tx.color.count({ where }),
      ]);

      return { items, total, page, pageSize };
    });
  }

  async findOne(id: string) {
    const color = await this.prisma.color.findUnique({ where: { id } });

    if (!color) {
      throw new NotFoundException('Couleur introuvable');
    }

    return color;
  }

  create(dto: CreateColorDto) {
    return this.prisma.color.create({
      data: {
        name: dto.name.trim(),
        hex: dto.hex.trim().toUpperCase(),
        active: dto.active ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateColorDto) {
    await this.findOne(id);

    return this.prisma.color.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.hex !== undefined ? { hex: dto.hex.trim().toUpperCase() } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.color.delete({ where: { id } });
    return { message: 'Couleur supprimee' };
  }
}
