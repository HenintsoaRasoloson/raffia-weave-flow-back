import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import bcrypt from 'bcryptjs';
import type { Prisma } from '../generated/prisma/client';
import { UserRole } from '../generated/prisma/client';
import { ListQueryDto } from '../common/dto/list-query.dto';
import { enumWhere } from '../common/prisma/enum-filter.util';
import { dateFieldWhere } from '../common/query/date-range.util';
import { buildFrenchTableTextWhere } from '../common/query/search.util';
import { resolveOrderBy } from '../common/query/sort.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const USER_SORT_FIELDS = ['createdAt', 'email', 'name'] as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ListQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const textWhere = await buildFrenchTableTextWhere(
      this.prisma,
      'User',
      ['email', 'name'],
      query.q,
    );
    const where: Prisma.UserWhereInput = {
      ...enumWhere('role', query.type, UserRole),
      ...dateFieldWhere('createdAt', query.dateFrom, query.dateTo),
      ...textWhere,
    };

    return this.prisma.$transaction(async (tx) => {
      const [items, total] = await Promise.all([
        tx.user.findMany({
          where,
          orderBy: resolveOrderBy(query, USER_SORT_FIELDS, 'createdAt'),
          skip: (page - 1) * pageSize,
          take: pageSize,
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isAdmin: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
        tx.user.count({ where }),
      ]);

      return { items, total, page, pageSize };
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isAdmin: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    return user;
  }

  async create(dto: CreateUserDto) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });

    if (existing) {
      throw new ConflictException('Cet email est deja utilise');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    return this.prisma.user.create({
      data: {
        email,
        name: dto.name?.trim() || null,
        role: dto.role,
        isAdmin: dto.isAdmin ?? false,
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isAdmin: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id);

    if (dto.email) {
      const email = dto.email.trim().toLowerCase();
      const existing = await this.prisma.user.findFirst({
        where: { email, NOT: { id } },
      });

      if (existing) {
        throw new ConflictException('Cet email est deja utilise');
      }
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.email !== undefined
          ? { email: dto.email.trim().toLowerCase() }
          : {}),
        ...(dto.name !== undefined ? { name: dto.name?.trim() || null } : {}),
        ...(dto.role !== undefined ? { role: dto.role } : {}),
        ...(dto.isAdmin !== undefined ? { isAdmin: dto.isAdmin } : {}),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isAdmin: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.user.delete({ where: { id } });
    return { message: 'Utilisateur supprime' };
  }
}
