import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { mkdir, readFile, unlink, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { compressBufferIfNeeded, decompressBufferIfNeeded } from '../ged/compression.util';
import { DEFAULT_GED_BUCKET_ARCHIVE } from '../ged/ged.constants';
import { GedPathsService } from '../ged/ged-paths.service';
import { MinioService } from '../ged/minio.service';
import { PrismaService } from '../prisma/prisma.service';
import { UploadInvoiceDocumentDto } from './dto/upload-invoice-document.dto';

@Injectable()
export class InvoiceDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly minioService: MinioService,
    private readonly gedPathsService: GedPathsService,
  ) {}

  async listDocuments(invoiceId: string) {
    await this.ensureInvoiceExists(invoiceId);
    return this.prisma.invoiceDocument
      .findMany({
        where: { invoiceId },
        orderBy: { createdAt: 'desc' },
      })
      .then((items) =>
        items.map((item) => ({
          ...item,
          version: this.extractVersion(item.objectKey ?? item.storagePath),
        })),
      );
  }

  async deleteDocument(invoiceId: string, documentId: string) {
    const document = await this.prisma.invoiceDocument.findFirst({
      where: { id: documentId, invoiceId },
    });
    if (!document) {
      throw new NotFoundException('Document de facture introuvable');
    }

    await this.removeStoredObject(document);
    await this.prisma.invoiceDocument.delete({ where: { id: documentId } });
    return { id: documentId, deleted: true };
  }

  async replaceDocument(
    invoiceId: string,
    documentId: string,
    file: Express.Multer.File,
    userId?: string,
  ) {
    const existing = await this.prisma.invoiceDocument.findFirst({
      where: { id: documentId, invoiceId },
    });
    if (!existing) {
      throw new NotFoundException('Document de facture introuvable');
    }
    if (!file) {
      throw new BadRequestException('Aucun fichier reçu. Champ attendu: file');
    }

    const nextVersion =
      this.extractVersion(existing.objectKey ?? existing.storagePath) + 1;

    const created = await this.uploadDocument(
      invoiceId,
      { kind: existing.kind },
      file,
      userId,
      { version: nextVersion },
    );

    return {
      replacedDocumentId: documentId,
      newDocumentId: created.id,
      version: nextVersion,
      document: created,
    };
  }

  async uploadDocument(
    invoiceId: string,
    dto: UploadInvoiceDocumentDto,
    file: Express.Multer.File,
    userId?: string,
    options?: { version?: number },
  ) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: { id: true, referenceLevel: true },
    });
    if (!invoice) {
      throw new NotFoundException('Facture introuvable');
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
      entityType: 'invoice',
      entityId: invoiceId,
      documentType: `signed-${dto.kind.toLowerCase()}`,
      originalFileName: file.originalname,
      version: options?.version,
    });

    const storedName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    let bucket: string | null = null;
    let persistedObjectKey: string | null = null;
    let storagePath: string | null = null;

    if (this.minioService.isEnabled()) {
      bucket = DEFAULT_GED_BUCKET_ARCHIVE;
      persistedObjectKey = objectKey;
      await this.minioService.putObject({
        bucket,
        key: objectKey,
        body: storedBuffer,
        contentType: file.mimetype,
        contentEncoding: algo === 'GZIP' ? 'gzip' : undefined,
      });
    } else {
      storagePath = join(process.cwd(), 'uploads', 'invoices', objectKey);
      await mkdir(dirname(storagePath), { recursive: true });
      await writeFile(storagePath, storedBuffer);
    }

    return this.prisma.invoiceDocument.create({
      data: {
        invoiceId,
        referenceLevel: invoice.referenceLevel,
        kind: dto.kind,
        originalName: file.originalname,
        storedName,
        mimeType: file.mimetype,
        fileSize: file.size,
        storagePath,
        bucket,
        objectKey: persistedObjectKey,
        originalSize: file.size,
        compressedSize: storedBuffer.length,
        compressionAlgo: algo,
        uploadedById: userId,
      },
    });
  }

  async getDocumentForDownload(invoiceId: string, documentId: string) {
    const document = await this.prisma.invoiceDocument.findFirst({
      where: {
        id: documentId,
        invoiceId,
      },
    });

    if (!document) {
      throw new NotFoundException('Document de facture introuvable');
    }

    let storedBuffer: Buffer;
    if (document.bucket && document.objectKey && this.minioService.isEnabled()) {
      storedBuffer = await this.minioService.getObjectAsBuffer({
        bucket: document.bucket,
        key: document.objectKey,
      });
    } else if (document.storagePath) {
      storedBuffer = await readFile(document.storagePath);
    } else {
      throw new NotFoundException('Fichier de facture indisponible');
    }

    return {
      ...document,
      buffer: decompressBufferIfNeeded(storedBuffer, document.compressionAlgo),
    };
  }

  private async ensureInvoiceExists(invoiceId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: { id: true },
    });

    if (!invoice) {
      throw new NotFoundException('Facture introuvable');
    }
  }

  private extractVersion(pathLike?: string | null): number {
    if (!pathLike) return 1;
    const match = pathLike.match(/\/v(\d+)\//);
    return match ? Number(match[1]) : 1;
  }

  private async removeStoredObject(document: {
    bucket: string | null;
    objectKey: string | null;
    storagePath: string | null;
  }) {
    if (document.bucket && document.objectKey && this.minioService.isEnabled()) {
      await this.minioService.removeObject({
        bucket: document.bucket,
        key: document.objectKey,
      });
      return;
    }

    if (document.storagePath) {
      await unlink(document.storagePath).catch(() => undefined);
    }
  }
}
