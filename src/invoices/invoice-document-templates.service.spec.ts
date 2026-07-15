import { NotFoundException } from '@nestjs/common';
import type { CompanySettingsService } from '../company-settings/company-settings.service';
import type { PrismaService } from '../prisma/prisma.service';
import { INVOICE_DOCUMENT_CONTENT_VERSION } from './invoice-document-templates.constants';
import { InvoiceDocumentTemplatesService } from './invoice-document-templates.service';
import type { InvoiceDocumentContentDto } from './dto/invoice-document-content.dto';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

function buildValidContent(
  overrides?: Partial<InvoiceDocumentContentDto>,
): InvoiceDocumentContentDto {
  return {
    version: INVOICE_DOCUMENT_CONTENT_VERSION,
    header: {
      showLogo: true,
      showCompanyName: true,
      showCompanyAddress: true,
      showSiret: true,
      showVatNumber: true,
      titleOverride: null,
    },
    clientBlock: {
      showAddress: true,
      showContactName: true,
      label: 'Facturé à',
    },
    meta: {
      showInvoiceNumber: true,
      showIssueDate: true,
      showDueDate: true,
      showOrderReference: true,
      showCurrency: true,
    },
    lines: {
      columns: {
        description: true,
        quantity: true,
        unitPriceHt: true,
        taxRate: true,
        lineTotalHt: true,
      },
    },
    totals: {
      showSubtotalHt: true,
      showTaxAmount: true,
      showTotalTtc: true,
      showPaidAmount: false,
    },
    notes: {
      showInvoiceNotes: true,
      introText: null,
      closingText: null,
    },
    legal: {
      showCgv: true,
      showIban: true,
      customMentions: null,
    },
    footer: {
      text: 'Merci — {{companyName}}',
    },
    ...overrides,
  };
}

describe('InvoiceDocumentTemplatesService', () => {
  const companySettings = {
    getSettings: jest.fn().mockResolvedValue({
      companyName: 'Atelier Raphia',
      addressLine: '1 rue Test',
      postalCode: '34000',
      city: 'Montpellier',
      country: 'France',
      siret: '123',
      vatNumber: 'FR123',
      iban: 'FR76',
      cgvText: 'CGV test',
    }),
  } as unknown as CompanySettingsService;

  it('returns empty list without error', async () => {
    const prisma = {
      invoiceDocumentTemplate: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    } as unknown as PrismaService;

    const service = new InvoiceDocumentTemplatesService(
      prisma,
      companySettings,
    );
    await expect(service.list()).resolves.toEqual([]);
  });

  it('clears previous default in same invoiceType scope on create', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const create = jest.fn().mockResolvedValue({
      id: 'tpl-new',
      name: 'Nouveau',
      invoiceType: 'FINAL',
      isDefault: true,
      locale: 'fr',
      content: buildValidContent(),
      createdAt: new Date('2026-07-15T10:00:00.000Z'),
      updatedAt: new Date('2026-07-15T10:00:00.000Z'),
    });

    const prisma = {
      $transaction: jest.fn(async (cb: (tx: unknown) => Promise<unknown>) =>
        cb({
          invoiceDocumentTemplate: { updateMany, create },
        }),
      ),
    } as unknown as PrismaService;

    const service = new InvoiceDocumentTemplatesService(
      prisma,
      companySettings,
    );

    const result = await service.create({
      name: 'Nouveau',
      invoiceType: 'FINAL',
      isDefault: true,
      content: buildValidContent(),
    });

    expect(updateMany).toHaveBeenCalledWith({
      where: { invoiceType: 'FINAL', isDefault: true },
      data: { isDefault: false },
    });
    expect(result.isDefault).toBe(true);
    expect(result.invoiceType).toBe('FINAL');
  });

  it('setDefault clears only same scope then marks template default', async () => {
    const existing = {
      id: 'tpl-1',
      name: 'Global',
      invoiceType: null,
      isDefault: false,
      locale: 'fr',
      content: buildValidContent(),
      createdAt: new Date('2026-07-15T10:00:00.000Z'),
      updatedAt: new Date('2026-07-15T10:00:00.000Z'),
    };
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const update = jest.fn().mockResolvedValue({ ...existing, isDefault: true });

    const prisma = {
      invoiceDocumentTemplate: {
        findUnique: jest.fn().mockResolvedValue(existing),
      },
      $transaction: jest.fn(async (cb: (tx: unknown) => Promise<unknown>) =>
        cb({
          invoiceDocumentTemplate: { updateMany, update },
        }),
      ),
    } as unknown as PrismaService;

    const service = new InvoiceDocumentTemplatesService(
      prisma,
      companySettings,
    );
    const result = await service.setDefault('tpl-1');

    expect(updateMany).toHaveBeenCalledWith({
      where: {
        invoiceType: null,
        isDefault: true,
        id: { not: 'tpl-1' },
      },
      data: { isDefault: false },
    });
    expect(result.isDefault).toBe(true);
  });

  it('preview without invoiceId returns non-empty html', async () => {
    const prisma = {
      invoiceDocumentTemplate: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'tpl-1',
          name: 'Classic',
          invoiceType: 'FINAL',
          isDefault: true,
          locale: 'fr',
          content: buildValidContent(),
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      },
    } as unknown as PrismaService;

    const service = new InvoiceDocumentTemplatesService(
      prisma,
      companySettings,
    );
    const result = await service.preview('tpl-1', {});

    expect(result.html).toContain('<!DOCTYPE html>');
    expect(result.html.length).toBeGreaterThan(100);
    expect(result.html).toContain('Atelier Raphia');
  });

  it('preview with unknown invoiceId throws 404', async () => {
    const prisma = {
      invoiceDocumentTemplate: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'tpl-1',
          name: 'Classic',
          invoiceType: null,
          isDefault: false,
          locale: 'fr',
          content: buildValidContent(),
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      },
      invoice: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    } as unknown as PrismaService;

    const service = new InvoiceDocumentTemplatesService(
      prisma,
      companySettings,
    );

    await expect(
      service.preview('tpl-1', { invoiceId: 'missing' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('resolveDocumentTemplate prefers typed default over global', async () => {
    const prisma = {
      invoiceDocumentTemplate: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce({
            id: 'typed',
            name: 'FINAL default',
            invoiceType: 'FINAL',
            isDefault: true,
            locale: 'fr',
            content: buildValidContent(),
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .mockResolvedValueOnce(null),
      },
    } as unknown as PrismaService;

    const service = new InvoiceDocumentTemplatesService(
      prisma,
      companySettings,
    );
    const resolved = await service.resolveDocumentTemplate('FINAL');

    expect(resolved?.id).toBe('typed');
    expect(prisma.invoiceDocumentTemplate.findFirst).toHaveBeenCalledWith({
      where: { invoiceType: 'FINAL', isDefault: true },
    });
  });

  it('throws NotFound when template id is unknown', async () => {
    const prisma = {
      invoiceDocumentTemplate: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    } as unknown as PrismaService;

    const service = new InvoiceDocumentTemplatesService(
      prisma,
      companySettings,
    );

    await expect(service.findOne('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
