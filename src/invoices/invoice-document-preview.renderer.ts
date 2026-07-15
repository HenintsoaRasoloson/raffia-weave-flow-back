import {
  INVOICE_DOCUMENT_PREVIEW_LABELS,
  INVOICE_TYPE_TITLES,
} from './invoice-document-preview.constants';
import type { InvoiceDocumentContentDto } from './dto/invoice-document-content.dto';
import type { InvoiceDocumentPlaceholder } from './invoice-document-templates.constants';
import { INVOICE_DOCUMENT_PLACEHOLDERS } from './invoice-document-templates.constants';
import type { InvoiceDocumentTypeValue } from './invoice-document-templates.constants';

export type InvoiceDocumentPreviewLine = {
  description: string;
  quantity: string;
  unitPriceHt: string;
  taxRate: string;
  lineTotalHt: string;
};

export type InvoiceDocumentPreviewData = {
  companyName: string;
  companyAddress: string;
  siret: string;
  vatNumber: string;
  iban: string;
  cgvText: string;
  /** Data-URI du logo facture résolu (override invoice → primary), sinon null. */
  logoDataUri: string | null;
  clientName: string;
  clientAddress: string;
  contactName: string;
  invoiceNumber: string;
  invoiceTitle: string;
  issueDate: string;
  dueDate: string;
  orderReference: string;
  currency: string;
  invoiceNotes: string;
  lines: InvoiceDocumentPreviewLine[];
  subtotalHt: string;
  taxAmount: string;
  totalTtc: string;
  paidAmount: string;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function applyPlaceholders(
  text: string,
  data: InvoiceDocumentPreviewData,
): string {
  let result = text;
  for (const key of INVOICE_DOCUMENT_PLACEHOLDERS) {
    const token = `{{${key}}}` as `{{${InvoiceDocumentPlaceholder}}}`;
    result = result.replaceAll(token, data[key]);
  }
  return result;
}

function nl2br(value: string): string {
  return escapeHtml(value).replaceAll('\n', '<br />');
}

export function resolveInvoiceDocumentTitle(
  content: InvoiceDocumentContentDto,
  invoiceType?: InvoiceDocumentTypeValue | null,
): string {
  const override = content.header.titleOverride?.trim();
  if (override) {
    return override;
  }
  if (invoiceType) {
    return INVOICE_TYPE_TITLES[invoiceType as keyof typeof INVOICE_TYPE_TITLES];
  }
  return INVOICE_TYPE_TITLES.FINAL;
}

export function buildInvoiceDocumentPreviewHtml(
  content: InvoiceDocumentContentDto,
  data: InvoiceDocumentPreviewData,
): string {
  const labels = INVOICE_DOCUMENT_PREVIEW_LABELS;
  const headerBits: string[] = [];

  if (content.header.showLogo) {
    if (data.logoDataUri) {
      headerBits.push(
        `<img src="${escapeHtml(data.logoDataUri)}" alt="${escapeHtml(labels.logoPlaceholder)}" style="max-width:120px;max-height:56px;object-fit:contain;" />`,
      );
    } else {
      headerBits.push(
        `<div style="width:56px;height:56px;border:1px dashed #94a3b8;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#64748b;font-size:11px;">${escapeHtml(labels.logoPlaceholder)}</div>`,
      );
    }
  }

  const companyBits: string[] = [];
  if (content.header.showCompanyName) {
    companyBits.push(
      `<div style="font-size:18px;font-weight:700;">${escapeHtml(data.companyName)}</div>`,
    );
  }
  if (content.header.showCompanyAddress) {
    companyBits.push(
      `<div style="color:#475569;margin-top:4px;">${nl2br(data.companyAddress)}</div>`,
    );
  }
  if (content.header.showSiret) {
    companyBits.push(
      `<div style="color:#64748b;margin-top:4px;">${escapeHtml(labels.siretPrefix)} ${escapeHtml(data.siret)}</div>`,
    );
  }
  if (content.header.showVatNumber) {
    companyBits.push(
      `<div style="color:#64748b;">${escapeHtml(labels.vatPrefix)} ${escapeHtml(data.vatNumber)}</div>`,
    );
  }

  const clientLabel =
    content.clientBlock.label?.trim() || labels.defaultClientLabel;
  const clientBits: string[] = [
    `<div style="font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#64748b;">${escapeHtml(clientLabel)}</div>`,
    `<div style="font-weight:600;margin-top:4px;">${escapeHtml(data.clientName)}</div>`,
  ];
  if (content.clientBlock.showContactName) {
    clientBits.push(
      `<div style="color:#475569;">${escapeHtml(data.contactName)}</div>`,
    );
  }
  if (content.clientBlock.showAddress) {
    clientBits.push(
      `<div style="color:#475569;margin-top:4px;">${nl2br(data.clientAddress)}</div>`,
    );
  }

  const metaRows: string[] = [];
  if (content.meta.showInvoiceNumber) {
    metaRows.push(
      `<tr><td style="padding:2px 12px 2px 0;color:#64748b;">${escapeHtml(labels.metaInvoiceNumber)}</td><td style="font-weight:600;">${escapeHtml(data.invoiceNumber)}</td></tr>`,
    );
  }
  if (content.meta.showIssueDate) {
    metaRows.push(
      `<tr><td style="padding:2px 12px 2px 0;color:#64748b;">${escapeHtml(labels.metaIssueDate)}</td><td>${escapeHtml(data.issueDate)}</td></tr>`,
    );
  }
  if (content.meta.showDueDate) {
    metaRows.push(
      `<tr><td style="padding:2px 12px 2px 0;color:#64748b;">${escapeHtml(labels.metaDueDate)}</td><td>${escapeHtml(data.dueDate)}</td></tr>`,
    );
  }
  if (content.meta.showOrderReference) {
    metaRows.push(
      `<tr><td style="padding:2px 12px 2px 0;color:#64748b;">${escapeHtml(labels.metaOrderReference)}</td><td>${escapeHtml(data.orderReference)}</td></tr>`,
    );
  }
  if (content.meta.showCurrency) {
    metaRows.push(
      `<tr><td style="padding:2px 12px 2px 0;color:#64748b;">${escapeHtml(labels.metaCurrency)}</td><td>${escapeHtml(data.currency)}</td></tr>`,
    );
  }

  const cols = content.lines.columns;
  const th: string[] = [
    `<th style="text-align:left;padding:8px;border-bottom:1px solid #e2e8f0;">${escapeHtml(labels.columnDescription)}</th>`,
  ];
  if (cols.quantity) {
    th.push(
      `<th style="text-align:right;padding:8px;border-bottom:1px solid #e2e8f0;">${escapeHtml(labels.columnQuantity)}</th>`,
    );
  }
  if (cols.unitPriceHt) {
    th.push(
      `<th style="text-align:right;padding:8px;border-bottom:1px solid #e2e8f0;">${escapeHtml(labels.columnUnitPriceHt)}</th>`,
    );
  }
  if (cols.taxRate) {
    th.push(
      `<th style="text-align:right;padding:8px;border-bottom:1px solid #e2e8f0;">${escapeHtml(labels.columnTaxRate)}</th>`,
    );
  }
  if (cols.lineTotalHt) {
    th.push(
      `<th style="text-align:right;padding:8px;border-bottom:1px solid #e2e8f0;">${escapeHtml(labels.columnLineTotalHt)}</th>`,
    );
  }

  const lineRows = data.lines
    .map((line) => {
      const cells = [
        `<td style="padding:8px;border-bottom:1px solid #f1f5f9;">${escapeHtml(line.description)}</td>`,
      ];
      if (cols.quantity) {
        cells.push(
          `<td style="padding:8px;border-bottom:1px solid #f1f5f9;text-align:right;">${escapeHtml(line.quantity)}</td>`,
        );
      }
      if (cols.unitPriceHt) {
        cells.push(
          `<td style="padding:8px;border-bottom:1px solid #f1f5f9;text-align:right;">${escapeHtml(line.unitPriceHt)}</td>`,
        );
      }
      if (cols.taxRate) {
        cells.push(
          `<td style="padding:8px;border-bottom:1px solid #f1f5f9;text-align:right;">${escapeHtml(line.taxRate)}</td>`,
        );
      }
      if (cols.lineTotalHt) {
        cells.push(
          `<td style="padding:8px;border-bottom:1px solid #f1f5f9;text-align:right;">${escapeHtml(line.lineTotalHt)}</td>`,
        );
      }
      return `<tr>${cells.join('')}</tr>`;
    })
    .join('');

  const totalRows: string[] = [];
  if (content.totals.showSubtotalHt) {
    totalRows.push(
      `<tr><td style="padding:4px 0;color:#64748b;">${escapeHtml(labels.totalSubtotalHt)}</td><td style="padding:4px 0;text-align:right;">${escapeHtml(data.subtotalHt)} ${escapeHtml(data.currency)}</td></tr>`,
    );
  }
  if (content.totals.showTaxAmount) {
    totalRows.push(
      `<tr><td style="padding:4px 0;color:#64748b;">${escapeHtml(labels.totalTaxAmount)}</td><td style="padding:4px 0;text-align:right;">${escapeHtml(data.taxAmount)} ${escapeHtml(data.currency)}</td></tr>`,
    );
  }
  if (content.totals.showTotalTtc) {
    totalRows.push(
      `<tr><td style="padding:8px 0 4px;font-weight:700;">${escapeHtml(labels.totalTtc)}</td><td style="padding:8px 0 4px;text-align:right;font-weight:700;">${escapeHtml(data.totalTtc)} ${escapeHtml(data.currency)}</td></tr>`,
    );
  }
  if (content.totals.showPaidAmount) {
    totalRows.push(
      `<tr><td style="padding:4px 0;color:#64748b;">${escapeHtml(labels.totalPaidAmount)}</td><td style="padding:4px 0;text-align:right;">${escapeHtml(data.paidAmount)} ${escapeHtml(data.currency)}</td></tr>`,
    );
  }

  const introHtml = content.notes.introText?.trim()
    ? `<p style="margin:0 0 12px;">${nl2br(applyPlaceholders(content.notes.introText, data))}</p>`
    : '';
  const invoiceNotesHtml = content.notes.showInvoiceNotes
    ? `<p style="margin:0 0 12px;color:#475569;">${nl2br(data.invoiceNotes)}</p>`
    : '';
  const closingHtml = content.notes.closingText?.trim()
    ? `<p style="margin:12px 0 0;">${nl2br(applyPlaceholders(content.notes.closingText, data))}</p>`
    : '';

  const legalBits: string[] = [];
  if (content.legal.showIban) {
    legalBits.push(
      `<div style="margin-bottom:8px;"><strong>${escapeHtml(labels.ibanLabel)}</strong> ${escapeHtml(data.iban)}</div>`,
    );
  }
  if (content.legal.showCgv) {
    legalBits.push(
      `<div style="margin-bottom:8px;color:#475569;">${nl2br(data.cgvText)}</div>`,
    );
  }
  if (content.legal.customMentions?.trim()) {
    legalBits.push(
      `<div style="color:#64748b;">${nl2br(applyPlaceholders(content.legal.customMentions, data))}</div>`,
    );
  }

  const footerText = content.footer.text?.trim()
    ? nl2br(applyPlaceholders(content.footer.text, data))
    : '';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(labels.documentTitle)}</title>
<style>
  body { margin: 0; background: #f8fafc; font-family: Georgia, "Times New Roman", serif; color: #0f172a; }
  .page {
    width: 210mm; min-height: 297mm; margin: 16px auto; padding: 18mm 16mm;
    background: #fff; box-shadow: 0 10px 30px rgba(15, 23, 42, .08);
    box-sizing: border-box;
  }
  @media print { body { background: #fff; } .page { margin: 0; box-shadow: none; } }
</style>
</head>
<body>
  <div class="page">
    <div style="display:flex;justify-content:space-between;gap:24px;align-items:flex-start;">
      <div style="display:flex;gap:12px;align-items:flex-start;">
        ${headerBits.join('')}
        <div>${companyBits.join('')}</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:22px;font-weight:700;">${escapeHtml(data.invoiceTitle)}</div>
        <table style="margin-top:8px;margin-left:auto;font-size:13px;">${metaRows.join('')}</table>
      </div>
    </div>

    <div style="margin-top:28px;padding:12px 14px;background:#f8fafc;border-radius:8px;max-width:280px;">
      ${clientBits.join('')}
    </div>

    ${introHtml ? `<div style="margin-top:20px;font-size:13px;">${introHtml}</div>` : ''}

    <table style="width:100%;border-collapse:collapse;margin-top:24px;font-size:13px;">
      <thead><tr>${th.join('')}</tr></thead>
      <tbody>${lineRows}</tbody>
    </table>

    <table style="width:240px;margin-left:auto;margin-top:20px;font-size:13px;">
      ${totalRows.join('')}
    </table>

    ${
      invoiceNotesHtml || closingHtml
        ? `<div style="margin-top:28px;font-size:13px;">${invoiceNotesHtml}${closingHtml}</div>`
        : ''
    }

    ${
      legalBits.length
        ? `<div style="margin-top:32px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:12px;">${legalBits.join('')}</div>`
        : ''
    }

    ${
      footerText
        ? `<div style="margin-top:28px;text-align:center;color:#64748b;font-size:12px;">${footerText}</div>`
        : ''
    }
  </div>
</body>
</html>`;
}
