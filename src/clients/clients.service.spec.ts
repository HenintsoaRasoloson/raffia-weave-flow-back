import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { GedPathsService } from '../ged/ged-paths.service';
import type { MinioService } from '../ged/minio.service';
import type { PrismaService } from '../prisma/prisma.service';
import { ClientsService } from './clients.service';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

describe('ClientsService legal form and pricing', () => {
  const minio = { isEnabled: () => false } as unknown as MinioService;
  const gedPaths = {} as GedPathsService;

  it('rejects COMPANY without nif/stat/contact', async () => {
    const service = new ClientsService({} as PrismaService, minio, gedPaths);

    expect(() =>
      service.create({
        name: 'Entreprise X',
        type: 'B2C',
        legalForm: 'COMPANY',
        email: 'a@b.com',
      }),
    ).toThrow(BadRequestException);
  });

  it('creates COMPANY when required fields are present', async () => {
    const prisma = {
      client: {
        create: jest.fn().mockResolvedValue({ id: 'c1' }),
      },
    } as unknown as PrismaService;
    const service = new ClientsService(prisma, minio, gedPaths);

    await service.create({
      name: 'Entreprise X',
      type: 'B2C',
      legalForm: 'COMPANY',
      email: 'resp@x.mg',
      phone: '+261340000000',
      contactName: 'Jean',
      nif: '123',
      stat: '456',
    });

    expect(prisma.client.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          legalForm: 'COMPANY',
          nif: '123',
          stat: '456',
          type: 'B2C',
        }),
      }),
    );
  });

  it('rejects variant prices for B2C clients', async () => {
    const prisma = {
      client: {
        findUnique: jest.fn().mockResolvedValue({ id: 'c1', type: 'B2C' }),
      },
    } as unknown as PrismaService;
    const service = new ClientsService(prisma, minio, gedPaths);

    await expect(
      service.upsertVariantPrices('c1', {
        prices: [
          {
            productId: 'p1',
            variantId: 'v1',
            agreedPriceHt: 50,
          },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('resolves B2C catalog price from variant override', async () => {
    const prisma = {
      client: {
        findUnique: jest.fn().mockResolvedValue({ id: 'c1', type: 'B2C' }),
      },
      productVariant: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'v1',
          productId: 'p1',
          priceOverride: 95,
          product: { id: 'p1', basePrice: 89, name: 'Cabas', ref: 'S/1' },
        }),
      },
    } as unknown as PrismaService;
    const service = new ClientsService(prisma, minio, gedPaths);

    const result = await service.resolvePrice('c1', 'v1');

    expect(result.source).toBe('CATALOG');
    expect(result.unitPriceHt).toBe(95);
  });

  it('resolves B2B agreement or signals manual required', async () => {
    const prisma = {
      client: {
        findUnique: jest.fn().mockResolvedValue({ id: 'c1', type: 'B2B' }),
      },
      productVariant: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'v1',
          productId: 'p1',
          priceOverride: null,
          product: { id: 'p1', basePrice: 89, name: 'Cabas', ref: 'S/1' },
        }),
      },
      clientVariantPrice: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    } as unknown as PrismaService;
    const service = new ClientsService(prisma, minio, gedPaths);

    const result = await service.resolvePrice('c1', 'v1');
    expect(result.source).toBe('MANUAL_REQUIRED');
    expect(result.unitPriceHt).toBeNull();
  });

  it('throws when client missing on price resolve', async () => {
    const prisma = {
      client: { findUnique: jest.fn().mockResolvedValue(null) },
    } as unknown as PrismaService;
    const service = new ClientsService(prisma, minio, gedPaths);

    await expect(service.resolvePrice('missing', 'v1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
