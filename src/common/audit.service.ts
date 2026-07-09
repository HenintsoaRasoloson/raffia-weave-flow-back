/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditLogInput {
  entityType: string;
  entityId: string;
  action: string;
  userId: string;
  changes?: Record<string, { before?: any; after?: any }>;
  details?: string;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(input: AuditLogInput) {
    try {
      const auditLog = this.prisma as any;
      return await auditLog.auditLog.create({
        data: {
          entityType: input.entityType,
          entityId: input.entityId,
          action: input.action,
          userId: input.userId,
          changes: input.changes,
          details: input.details,
        },
      });
    } catch (error) {
      console.error('Error logging audit:', error);
      throw error;
    }
  }

  async getEntityLogs(entityType: string, entityId: string, limit = 50) {
    const auditLog = this.prisma as any;
    return await auditLog.auditLog.findMany({
      where: { entityType, entityId },
      include: {
        user: { select: { id: true, email: true, name: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getUserLogs(userId: string, limit = 50) {
    const auditLog = this.prisma as any;
    return await auditLog.auditLog.findMany({
      where: { userId },
      include: { user: { select: { id: true, email: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getAllLogs(
    filters?: {
      entityType?: string;
      action?: string;
      userId?: string;
      startDate?: Date;
      endDate?: Date;
    },
    limit = 100,
  ) {
    const where: Record<string, any> = {};
    if (filters?.entityType) {
      where.entityType = filters.entityType;
    }
    if (filters?.action) {
      where.action = filters.action;
    }
    if (filters?.userId) {
      where.userId = filters.userId;
    }
    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    const auditLog = this.prisma as any;
    return await auditLog.auditLog.findMany({
      where,
      include: {
        user: { select: { id: true, email: true, name: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
