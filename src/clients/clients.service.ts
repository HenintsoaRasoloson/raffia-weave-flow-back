import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { ListQueryDto } from '../common/dto/list-query.dto';
import { compressBufferIfNeeded, decompressBufferIfNeeded } from '../ged/compression.util';
import { DEFAULT_GED_BUCKET_RAW } from '../ged/ged.constants';
import { GedPathsService } from '../ged/ged-paths.service';
import { MinioService } from '../ged/minio.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UploadClientFiscalCardDto } from './dto/upload-client-fiscal-card.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Injectable()
export class ClientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly minioService: MinioService,
    private readonly gedPathsService: GedPathsService,
  ) {}

  findAll(query: ListQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = {
      ...(query.status ? { status: query.status as any } : {}),
      ...(query.type ? { type: query.type as any } : {}),
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q } },
              { email: { contains: query.q } },
              { contactName: { contains: query.q } },
            ],
          }
        : {}),
    };

    return this.prisma.$transaction(async (tx) => {
      const [items, total] = await Promise.all([
        tx.client.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        tx.client.count({ where }),
      ]);

      return { items, total, page, pageSize };
    });
  }

  findOne(id: string) {
    return this.prisma.client.findUnique({
      where: { id },
      include: { fiscalCards: { orderBy: { createdAt: 'desc' } } },
    }).then((client) => {
      if (!client) return client;
      const today = new Date();
      const isFiscalCardsUpToDate =
        client.type === 'B2B'
          ? client.fiscalCards.some((card) => card.validUntil >= today)
          : true;

      return {
        ...client,
        isFiscalCardsUpToDate,
      };
    });
  }

  async listFiscalCards(clientId: string) {
    await this.ensureClientExists(clientId);
    return this.prisma.clientFiscalCard.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async uploadFiscalCard(
    clientId: string,
    dto: UploadClientFiscalCardDto,
    file: Express.Multer.File,
    userId?: string,
  ) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true, type: true },
    });

    if (!client) {
      throw new NotFoundException('Client introuvable');
    }
    if (client.type !== 'B2B') {
      throw new BadRequestException(
        'Les cartes fiscales sont requises uniquement pour les clients B2B.',
      );
    }
    if (!file) {
      throw new BadRequestException('Aucun fichier reçu. Champ attendu: file');
    }

    const { buffer: storedBuffer, algo } = compressBufferIfNeeded(
      file.buffer,
      file.mimetype,
    );
    const objectKey = this.gedPathsService.buildObjectKey({
      domain: 'finance',
      entityType: 'client',
      entityId: clientId,
      documentType: 'fiscal_card',
      originalFileName: file.originalname,
    });

    let bucket: string | null = null;
    let persistedObjectKey: string | null = null;
    let storagePath: string | null = null;

    if (this.minioService.isEnabled()) {
      bucket = DEFAULT_GED_BUCKET_RAW;
      persistedObjectKey = objectKey;
      await this.minioService.putObject({
        bucket,
        key: objectKey,
        body: storedBuffer,
        contentType: file.mimetype,
        contentEncoding: algo === 'GZIP' ? 'gzip' : undefined,
      });
    } else {
      storagePath = join(process.cwd(), 'uploads', 'ged', objectKey);
      await mkdir(dirname(storagePath), { recursive: true });
      await writeFile(storagePath, storedBuffer);
    }

    return this.prisma.clientFiscalCard.create({
      data: {
        clientId,
        originalName: file.originalname,
        mimeType: file.mimetype,
        bucket,
        objectKey: persistedObjectKey,
        storagePath,
        originalSize: file.size,
        compressedSize: storedBuffer.length,
        compressionAlgo: algo,
        validUntil: new Date(dto.validUntil),
        uploadedById: userId,
      } as any,
    });
  }

  async getFiscalCardBinary(clientId: string, cardId: string) {
    const card = await this.prisma.clientFiscalCard.findFirst({
      where: { id: cardId, clientId },
    });

    if (!card) {
      throw new NotFoundException('Carte fiscale introuvable');
    }

    let storedBuffer: Buffer;
    if (card.bucket && card.objectKey && this.minioService.isEnabled()) {
      storedBuffer = await this.minioService.getObjectAsBuffer({
        bucket: card.bucket,
        key: card.objectKey,
      });
    } else if (card.storagePath) {
      storedBuffer = await readFile(card.storagePath);
    } else {
      throw new NotFoundException('Fichier de carte fiscale indisponible');
    }

    return {
      originalName: card.originalName,
      mimeType: card.mimeType,
      buffer: decompressBufferIfNeeded(storedBuffer, card.compressionAlgo),
    };
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

  private async ensureClientExists(clientId: string) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true },
    });

    if (!client) {
      throw new NotFoundException('Client introuvable');
    }
  }
}
