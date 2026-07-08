import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.product.findMany({
      include: { category: true, variants: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: string) {
    return this.prisma.product.findUnique({
      where: { id },
      include: { category: true, variants: true, bomItems: true },
    });
  }

  create(dto: CreateProductDto) {
    return this.prisma.product.create({
      data: dto as any,
    });
  }

  update(id: string, dto: UpdateProductDto) {
    return this.prisma.product.update({
      where: { id },
      data: dto as any,
    });
  }

  remove(id: string) {
    return this.prisma.product.delete({ where: { id } });
  }
}
