import { Injectable } from '@nestjs/common';
import { ListQueryDto } from '../common/dto/list-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(query: ListQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    return this.prisma.client.findMany({
      where: {
        ...(query.status ? { status: query.status as any } : {}),
        ...(query.type ? { type: query.type as any } : {}),
        ...(query.q
          ? {
              OR: [
                { name: { contains: query.q, mode: 'insensitive' } },
                { email: { contains: query.q, mode: 'insensitive' } },
                { contactName: { contains: query.q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
  }

  findOne(id: string) {
    return this.prisma.client.findUnique({ where: { id } });
  }

  create(dto: CreateClientDto) {
    return this.prisma.client.create({
      data: dto as any,
    });
  }

  update(id: string, dto: UpdateClientDto) {
    return this.prisma.client.update({
      where: { id },
      data: dto as any,
    });
  }

  remove(id: string) {
    return this.prisma.client.delete({ where: { id } });
  }
}
