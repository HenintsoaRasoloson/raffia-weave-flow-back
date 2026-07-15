import { Injectable, NotFoundException } from '@nestjs/common';
import {
  InvoiceType,
  type InvoiceDocumentTemplate,
  type Prisma,
} from '../generated/prisma/client';
import { CompanySettingsService } from '../company-settings/company-settings.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvoiceDocumentTemplateDto } from './dto/create-invoice-document-template.dto';
import type { InvoiceDocumentContentDto } from './dto/invoice-document-content.dto';
import { InvoiceDocumentTemplatePreviewResponseDto } from './dto/invoice-document-template-preview-response.dto';
import { InvoiceDocumentTemplateResponseDto } from './dto/invoice-document-template-response.dto';
import { PreviewInvoiceDocumentTemplateDto } from './dto/preview-invoice-document-template.dto';
import { UpdateInvoiceDocumentTemplateDto } from './dto/update-invoice-document-template.dto';
import { MOCK_INVOICE_DOCUMENT_PREVIEW } from './invoice-document-preview.constants';
import {
  buildInvoiceDocumentPreviewHtml,
  resolveInvoiceDocumentTitle,
  type InvoiceDocumentPreviewData,
} from './invoice-document-preview.renderer';
import {
  INVOICE_DOCUMENT_LOCALE,
  INVOICE_DOCUMENT_TYPES,
  type InvoiceDocumentTypeValue,
} from './invoice-document-templates.constants';

type TemplateRecord = InvoiceDocumentTemplate;

@Injectable()
export class InvoiceDocumentTemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly companySettingsService: CompanySettingsService,
  ) {}

  async list(): Promise<InvoiceDocumentTemplateResponseDto[]> {
    const items = await this.prisma.invoiceDocumentTemplate.findMany({
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    });
    return items.map((item) => this.toResponse(item));
  }

  async findOne(id: string): Promise<InvoiceDocumentTemplateResponseDto> {
    const item = await this.requireTemplate(id);
    return this.toResponse(item);
  }

  async create(
    dto: CreateInvoiceDocumentTemplateDto,
  ): Promise<InvoiceDocumentTemplateResponseDto> {
    const invoiceType = this.normalizeNullableInvoiceType(dto.invoiceType);
    const isDefault = dto.isDefault ?? false;

    const created = await this.prisma.$transaction(async (tx) => {
      if (isDefault) {
        await this.clearDefaultInScope(tx, invoiceType);
      }

      return tx.invoiceDocumentTemplate.create({
        data: {
          name: dto.name,
          invoiceType,
          isDefault,
          locale: INVOICE_DOCUMENT_LOCALE,
          content: dto.content as unknown as Prisma.InputJsonValue,
        },
      });
    });

    return this.toResponse(created);
  }

  async update(
    id: string,
    dto: UpdateInvoiceDocumentTemplateDto,
  ): Promise<InvoiceDocumentTemplateResponseDto> {
    const existing = await this.requireTemplate(id);

    const nextInvoiceType =
      dto.invoiceType !== undefined
        ? this.normalizeNullableInvoiceType(dto.invoiceType)
        : existing.invoiceType;
    const nextIsDefault =
      dto.isDefault !== undefined ? dto.isDefault : existing.isDefault;

    const updated = await this.prisma.$transaction(async (tx) => {
      if (nextIsDefault) {
        await this.clearDefaultInScope(tx, nextInvoiceType, id);
      }

      return tx.invoiceDocumentTemplate.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.invoiceType !== undefined
            ? { invoiceType: nextInvoiceType }
            : {}),
          ...(dto.isDefault !== undefined ? { isDefault: nextIsDefault } : {}),
          ...(dto.content !== undefined
            ? { content: dto.content as unknown as Prisma.InputJsonValue }
            : {}),
          locale: INVOICE_DOCUMENT_LOCALE,
        },
      });
    });

    return this.toResponse(updated);
  }

  async remove(id: string): Promise<void> {
    await this.requireTemplate(id);
    await this.prisma.invoiceDocumentTemplate.delete({ where: { id } });
  }

  async setDefault(id: string): Promise<InvoiceDocumentTemplateResponseDto> {
    const existing = await this.requireTemplate(id);

    const updated = await this.prisma.$transaction(async (tx) => {
      await this.clearDefaultInScope(tx, existing.invoiceType, id);
      return tx.invoiceDocumentTemplate.update({
        where: { id },
        data: { isDefault: true },
      });
    });

    return this.toResponse(updated);
  }

  async preview(
    id: string,
    dto: PreviewInvoiceDocumentTemplateDto,
  ): Promise<InvoiceDocumentTemplatePreviewResponseDto> {
    const template = await this.requireTemplate(id);
    const content = template.content as unknown as InvoiceDocumentContentDto;

    const data = dto.invoiceId
      ? await this.buildPreviewDataFromInvoice(dto.invoiceId, content)
      : await this.buildMockPreviewData(content, template.invoiceType);

    const html = buildInvoiceDocumentPreviewHtml(content, data);
    return { html };
  }

  /**
   * Résolution post-MVP à brancher sur l’émission PDF.
   * Ordre: défaut typé → défaut global (invoiceType null) → null (layout système).
   */
  async resolveDocumentTemplate(
    invoiceType: InvoiceDocumentTypeValue,
  ): Promise<InvoiceDocumentTemplateResponseDto | null> {
    const typedDefault = await this.prisma.invoiceDocumentTemplate.findFirst({
      where: { invoiceType, isDefault: true },
    });
    if (typedDefault) {
      return this.toResponse(typedDefault);
    }

    const globalDefault = await this.prisma.invoiceDocumentTemplate.findFirst({
      where: { invoiceType: null, isDefault: true },
    });
    if (globalDefault) {
      return this.toResponse(globalDefault);
    }

    return null;
  }

  private async requireTemplate(id: string): Promise<TemplateRecord> {
    const item = await this.prisma.invoiceDocumentTemplate.findUnique({
      where: { id },
    });
    if (!item) {
      throw new NotFoundException(`Template document introuvable: ${id}`);
    }
    return item;
  }

  private normalizeNullableInvoiceType(
    value: InvoiceDocumentTypeValue | InvoiceType | null | undefined,
  ): InvoiceType | null {
    if (value === undefined || value === null) {
      return null;
    }
    if (!INVOICE_DOCUMENT_TYPES.includes(value as InvoiceDocumentTypeValue)) {
      return null;
    }
    return value as InvoiceType;
  }

  private async clearDefaultInScope(
    tx: Prisma.TransactionClient,
    invoiceType: InvoiceType | null,
    exceptId?: string,
  ): Promise<void> {
    await tx.invoiceDocumentTemplate.updateMany({
      where: {
        invoiceType,
        isDefault: true,
        ...(exceptId ? { id: { not: exceptId } } : {}),
      },
      data: { isDefault: false },
    });
  }

  private toResponse(
    item: TemplateRecord,
  ): InvoiceDocumentTemplateResponseDto {
    return {
      id: item.id,
      name: item.name,
      invoiceType: item.invoiceType,
      isDefault: item.isDefault,
      locale: INVOICE_DOCUMENT_LOCALE,
      content: item.content as unknown as InvoiceDocumentContentDto,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  private async buildMockPreviewData(
    content: InvoiceDocumentContentDto,
    invoiceType: InvoiceType | null,
  ): Promise<InvoiceDocumentPreviewData> {
    const company = await this.companySettingsService.getSettings();
    const logoDataUri =
      await this.companySettingsService.resolveLogoDataUri('invoice');
    const addressParts = [
      company.addressLine,
      [company.postalCode, company.city].filter(Boolean).join(' '),
      company.country,
    ].filter(Boolean);

    return {
      companyName:
        company.companyName || MOCK_INVOICE_DOCUMENT_PREVIEW.companyName,
      companyAddress:
        addressParts.length > 0
          ? addressParts.join('\n')
          : MOCK_INVOICE_DOCUMENT_PREVIEW.companyAddress,
      siret: company.siret || MOCK_INVOICE_DOCUMENT_PREVIEW.siret,
      vatNumber: company.vatNumber || MOCK_INVOICE_DOCUMENT_PREVIEW.vatNumber,
      iban: company.iban || MOCK_INVOICE_DOCUMENT_PREVIEW.iban,
      cgvText: company.cgvText || MOCK_INVOICE_DOCUMENT_PREVIEW.cgvText,
      logoDataUri,
      clientName: MOCK_INVOICE_DOCUMENT_PREVIEW.clientName,
      clientAddress: MOCK_INVOICE_DOCUMENT_PREVIEW.clientAddress,
      contactName: MOCK_INVOICE_DOCUMENT_PREVIEW.contactName,
      invoiceNumber: MOCK_INVOICE_DOCUMENT_PREVIEW.invoiceNumber,
      invoiceTitle: resolveInvoiceDocumentTitle(content, invoiceType),
      issueDate: MOCK_INVOICE_DOCUMENT_PREVIEW.issueDate,
      dueDate: MOCK_INVOICE_DOCUMENT_PREVIEW.dueDate,
      orderReference: MOCK_INVOICE_DOCUMENT_PREVIEW.orderReference,
      currency: MOCK_INVOICE_DOCUMENT_PREVIEW.currency,
      invoiceNotes: MOCK_INVOICE_DOCUMENT_PREVIEW.invoiceNotes,
      lines: MOCK_INVOICE_DOCUMENT_PREVIEW.lines.map((line) => ({ ...line })),
      subtotalHt: MOCK_INVOICE_DOCUMENT_PREVIEW.subtotalHt,
      taxAmount: MOCK_INVOICE_DOCUMENT_PREVIEW.taxAmount,
      totalTtc: MOCK_INVOICE_DOCUMENT_PREVIEW.totalTtc,
      paidAmount: MOCK_INVOICE_DOCUMENT_PREVIEW.paidAmount,
    };
  }

  private async buildPreviewDataFromInvoice(
    invoiceId: string,
    content: InvoiceDocumentContentDto,
  ): Promise<InvoiceDocumentPreviewData> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        client: true,
        salesOrder: true,
        items: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Facture introuvable: ${invoiceId}`);
    }

    const company = await this.companySettingsService.getSettings();
    const logoDataUri =
      await this.companySettingsService.resolveLogoDataUri('invoice');
    const client = invoice.client;
    const companyAddress = [
      company.addressLine,
      [company.postalCode, company.city].filter(Boolean).join(' '),
      company.country,
    ]
      .filter(Boolean)
      .join('\n');
    const clientAddress = [
      client.addressLine,
      [client.postalCode, client.city].filter(Boolean).join(' '),
      client.country,
    ]
      .filter(Boolean)
      .join('\n');

    return {
      companyName: company.companyName,
      companyAddress,
      siret: company.siret ?? '',
      vatNumber: company.vatNumber ?? '',
      iban: company.iban ?? '',
      cgvText: company.cgvText ?? '',
      logoDataUri,
      clientName: client.name,
      clientAddress,
      contactName: client.contactName ?? '',
      invoiceNumber: invoice.invoiceNumber,
      invoiceTitle: resolveInvoiceDocumentTitle(content, invoice.type),
      issueDate: this.formatDateFr(invoice.issueDate),
      dueDate: invoice.dueDate ? this.formatDateFr(invoice.dueDate) : '',
      orderReference: invoice.salesOrder?.orderNumber ?? '',
      currency: invoice.currency,
      invoiceNotes: invoice.notes ?? '',
      lines: invoice.items.map((item) => ({
        description: item.description,
        quantity: String(item.quantity),
        unitPriceHt: this.formatDecimalFr(item.unitPriceHt),
        taxRate: `${this.formatDecimalFr(item.taxRate)} %`,
        lineTotalHt: this.formatDecimalFr(item.lineTotalHt),
      })),
      subtotalHt: this.formatDecimalFr(invoice.subtotalHt),
      taxAmount: this.formatDecimalFr(invoice.taxAmount),
      totalTtc: this.formatDecimalFr(invoice.totalTtc),
      paidAmount: this.formatDecimalFr(invoice.paidAmount ?? 0),
    };
  }

  private formatDateFr(value: Date): string {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(value);
  }

  private formatDecimalFr(value: Prisma.Decimal | number | string): string {
    const numeric =
      typeof value === 'number'
        ? value
        : typeof value === 'string'
          ? Number(value)
          : Number(value.toString());

    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numeric);
  }
}
