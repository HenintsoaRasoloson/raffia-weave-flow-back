import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.client.findMany({
      orderBy: { createdAt: 'desc' },
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
