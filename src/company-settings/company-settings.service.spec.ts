import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { GedPathsService } from '../ged/ged-paths.service';
import type { MinioService } from '../ged/minio.service';
import type { PrismaService } from '../prisma/prisma.service';
import { CompanySettingsService } from './company-settings.service';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

describe('CompanySettingsService', () => {
  const settingsRow = {
    id: 'cst1',
    companyName: 'Atelier Raphia',
    siret: null,
    vatNumber: null,
    iban: null,
    addressLine: null,
    city: null,
    postalCode: null,
    country: null,
    cgvText: null,
    defaultCurrency: 'MGA',
    eurToMgaRate: 5000,
    autoSendInvoices: true,
    lowStockAlerts: true,
    aiDecisionSupport: true,
    darkMode: false,
    createdAt: new Date('2026-07-01T00:00:00.000Z'),
    updatedAt: new Date('2026-07-01T00:00:00.000Z'),
  };

  const minio = {
    isEnabled: () => false,
    putObject: jest.fn(),
    getObjectAsBuffer: jest.fn(),
    removeObject: jest.fn(),
  } as unknown as MinioService;

  const gedPaths = {
    buildObjectKey: jest.fn(
      ({
        domain,
        entityType,
        entityId,
        documentType,
        version,
      }: {
        domain: string;
        entityType: string;
        entityId: string;
        documentType: string;
        version?: number;
      }) =>
        `${domain}/${entityType}/${entityId}/${documentType}/2026/07/15/v${version ?? 1}/file.png`,
    ),
  } as unknown as GedPathsService;

  it('parseLogoKind rejects invalid kinds', () => {
    const service = new CompanySettingsService(
      {} as PrismaService,
      minio,
      gedPaths,
    );
    expect(() => service.parseLogoKind('favicon')).toThrow(BadRequestException);
    expect(service.parseLogoKind('INVOICE')).toBe('invoice');
  });

  it('getSettings returns empty logo slots with fallback flags', async () => {
    const prisma = {
      companySetting: {
        findFirst: jest.fn().mockResolvedValue(settingsRow),
      },
      companyLogo: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    } as unknown as PrismaService;

    const service = new CompanySettingsService(prisma, minio, gedPaths);
    const result = await service.getSettings();

    expect(result.logoSlots).toHaveLength(4);
    expect(result.logoSlots.every((s) => s.logo === null)).toBe(true);
    expect(result.logoSlots.every((s) => s.resolved === null)).toBe(true);
    expect(result.logoSlots.every((s) => s.fallsBackToPrimary === false)).toBe(
      true,
    );
    expect(result.defaultCurrency).toBe('MGA');
    expect(result.eurToMgaRate).toBe(5000);
  });

  it('convertCurrency converts MGA to EUR with company rate', async () => {
    const prisma = {
      companySetting: {
        findFirst: jest.fn().mockResolvedValue(settingsRow),
      },
    } as unknown as PrismaService;

    const service = new CompanySettingsService(prisma, minio, gedPaths);
    const result = await service.convertCurrency({
      amount: 10000,
      from: 'MGA',
      to: 'EUR',
    });

    expect(result.convertedAmount).toBe(2);
    expect(result.eurToMgaRate).toBe(5000);
  });

  it('falls back to primary for invoice when invoice slot empty', async () => {
    const primaryLogo = {
      id: 'clg1',
      companySettingId: 'cst1',
      kind: 'PRIMARY',
      originalName: 'main.png',
      mimeType: 'image/png',
      bucket: null,
      objectKey: null,
      storagePath: '/tmp/main.png',
      originalSize: 10,
      compressedSize: 8,
      compressionAlgo: 'NONE',
      uploadedById: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const prisma = {
      companySetting: {
        findFirst: jest.fn().mockResolvedValue(settingsRow),
      },
      companyLogo: {
        findMany: jest.fn().mockResolvedValue([primaryLogo]),
      },
    } as unknown as PrismaService;

    const service = new CompanySettingsService(prisma, minio, gedPaths);
    const result = await service.getSettings();
    const invoiceSlot = result.logoSlots.find((s) => s.kind === 'invoice');

    expect(invoiceSlot?.logo).toBeNull();
    expect(invoiceSlot?.resolved?.id).toBe('clg1');
    expect(invoiceSlot?.fallsBackToPrimary).toBe(true);
  });

  it('deleteLogo throws when slot empty', async () => {
    const prisma = {
      companySetting: {
        findFirst: jest.fn().mockResolvedValue(settingsRow),
      },
      companyLogo: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    } as unknown as PrismaService;

    const service = new CompanySettingsService(prisma, minio, gedPaths);
    await expect(service.deleteLogo('email')).rejects.toThrow(NotFoundException);
  });

  it('buildObjectKey uses admin/company-setting/logo_* on upsert', async () => {
    const prisma = {
      companySetting: {
        findFirst: jest.fn().mockResolvedValue(settingsRow),
      },
      companyLogo: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 'clg-new',
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
        ),
      },
    } as unknown as PrismaService;

    const service = new CompanySettingsService(prisma, minio, gedPaths);
    const file = {
      originalname: 'logo.png',
      mimetype: 'image/png',
      size: 100,
      buffer: Buffer.from('fake-png'),
    } as Express.Multer.File;

    await service.upsertLogo('primary', file, 'usr1');

    expect(gedPaths.buildObjectKey).toHaveBeenCalledWith(
      expect.objectContaining({
        domain: 'admin',
        entityType: 'company-setting',
        entityId: 'cst1',
        documentType: 'logo_primary',
        version: 1,
      }),
    );
  });
});
