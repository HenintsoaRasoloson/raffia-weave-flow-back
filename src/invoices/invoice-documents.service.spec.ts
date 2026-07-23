import { NotFoundException } from '@nestjs/common';
import type { GedPathsService } from '../ged/ged-paths.service';
import type { MinioService } from '../ged/minio.service';
import type { PrismaService } from '../prisma/prisma.service';
import { InvoiceDocumentsService } from './invoice-documents.service';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

describe('InvoiceDocumentsService', () => {
  it('lists documents with extracted version', async () => {
    const prisma = {
      invoice: {
        findUnique: jest.fn().mockResolvedValue({ id: 'inv-1' }),
      },
      invoiceDocument: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'doc-1',
            objectKey: 'finance/invoice/inv-1/signed_final/2026/07/23/v3/file.pdf',
            storagePath: null,
          },
        ]),
      },
    } as unknown as PrismaService;

    const service = new InvoiceDocumentsService(
      prisma,
      { isEnabled: () => false } as unknown as MinioService,
      {} as GedPathsService,
    );

    const items = await service.listDocuments('inv-1');
    expect(items[0].version).toBe(3);
  });

  it('rejects download when invoice document is missing', async () => {
    const prisma = {
      invoiceDocument: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    } as unknown as PrismaService;

    const service = new InvoiceDocumentsService(
      prisma,
      { isEnabled: () => false } as unknown as MinioService,
      {} as GedPathsService,
    );

    await expect(
      service.getDocumentForDownload('inv-1', 'doc-missing'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
