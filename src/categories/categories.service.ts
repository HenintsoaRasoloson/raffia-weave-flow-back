import { Injectable, NotFoundException } from '@nestjs/common';
import { ListQueryDto } from '../common/dto/list-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(query: ListQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = query.q
      ? {
          OR: [
            { name: { contains: query.q } },
            { slug: { contains: query.q } },
            { code: { contains: query.q } },
          ],
        }
      : {};

    return this.prisma.$transaction(async (tx) => {
      const [items, total] = await Promise.all([
        tx.category.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        tx.category.count({ where }),
      ]);

      return { items, total, page, pageSize };
    });
  }

  findOne(id: string) {
    return this.prisma.category.findUnique({ where: { id } });
  }

  create(dto: CreateCategoryDto) {
    return this.prisma.category.create({
      data: {
        name: dto.name,
        code: dto.code?.trim().toUpperCase(),
        slug: this.toSlug(dto.slug ?? dto.name),
      },
    });
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const existing = await this.prisma.category.findUnique({
      where: { id },
      select: { id: true, name: true, slug: true },
    });

    if (!existing) {
      throw new NotFoundException('Categorie introuvable');
    }

    const nextName = dto.name ?? existing.name;

    return this.prisma.category.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.code !== undefined ? { code: dto.code?.trim().toUpperCase() || null } : {}),
        ...(dto.slug !== undefined
          ? { slug: this.toSlug(dto.slug) }
          : dto.name !== undefined
            ? { slug: this.toSlug(nextName) }
            : {}),
      },
    });
  }

  remove(id: string) {
    return this.prisma.category.delete({ where: { id } });
  }

  private toSlug(input: string) {
    return input
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);
  }
}
