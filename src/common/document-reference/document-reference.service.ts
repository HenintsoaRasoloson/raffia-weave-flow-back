import { BadRequestException, Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  BUSINESS_DOC_LEVEL_LENGTH,
  BUSINESS_DOC_SCOPE,
} from './document-reference.constants';

export type PrismaTransactionClient = Prisma.TransactionClient;

@Injectable()
export class DocumentReferenceService {
  constructor(private readonly prisma: PrismaService) {}

  async allocateNextReferenceLevel(
    tx: PrismaTransactionClient | PrismaService = this.prisma,
  ): Promise<number> {
    const sequence = await tx.documentSequence.upsert({
      where: { scope: BUSINESS_DOC_SCOPE },
      update: { nextValue: { increment: 1 } },
      create: { scope: BUSINESS_DOC_SCOPE, nextValue: 2 },
      select: { nextValue: true },
    });

    return sequence.nextValue - 1;
  }

  buildReferenceNumber(prefix: string, level: number): string {
    return `${prefix}/${level.toString().padStart(BUSINESS_DOC_LEVEL_LENGTH, '0')}`;
  }

  parseReferenceNumber(
    prefix: string,
    rawNumber: string,
    label = 'document',
  ): { number: string; level: number } {
    const normalized = rawNumber.trim().toUpperCase();
    const regex = new RegExp(
      `^${prefix}\\/(\\d{${BUSINESS_DOC_LEVEL_LENGTH}})$`,
    );
    const match = normalized.match(regex);
    if (!match) {
      throw new BadRequestException(
        `Format ${label} invalide. Attendu: ${prefix}/${'0'.repeat(BUSINESS_DOC_LEVEL_LENGTH)}`,
      );
    }

    return {
      number: normalized,
      level: Number(match[1]),
    };
  }
}
