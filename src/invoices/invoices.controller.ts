import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AdminGuard } from '../auth/guards/admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAccessPayload } from '../auth/auth.types';
import { ListQueryDto } from '../common/dto/list-query.dto';
import { ApiPaginatedResponse } from '../common/swagger/api-paginated-response.decorator';
import { CreateInvoiceDocumentTemplateDto } from './dto/create-invoice-document-template.dto';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { InvoiceDocumentTemplatePreviewResponseDto } from './dto/invoice-document-template-preview-response.dto';
import { InvoiceDocumentTemplateResponseDto } from './dto/invoice-document-template-response.dto';
import { InvoiceResponseDto } from './dto/invoice-response.dto';
import { InvoiceTemplateResponseDto } from './dto/invoice-template-response.dto';
import { PreviewInvoiceDocumentTemplateDto } from './dto/preview-invoice-document-template.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { UpdateInvoiceDocumentTemplateDto } from './dto/update-invoice-document-template.dto';
import { UploadInvoiceDocumentDto } from './dto/upload-invoice-document.dto';
import { UpsertInvoiceTemplateDto } from './dto/upsert-invoice-template.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { InvoiceDocumentTemplatesService } from './invoice-document-templates.service';
import { InvoicesService } from './invoices.service';

function sanitizeFilename(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_');
}

@ApiTags('Factures')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('invoices')
export class InvoicesController {
  constructor(
    private readonly invoicesService: InvoicesService,
    private readonly documentTemplatesService: InvoiceDocumentTemplatesService,
  ) {}

  @Get('templates')
  @ApiOperation({ summary: 'Lister les templates de facture configurés' })
  @ApiOkResponse({
    description: 'Templates de facture',
    type: InvoiceTemplateResponseDto,
    isArray: true,
  })
  listTemplates(): Promise<InvoiceTemplateResponseDto[]> {
    return this.invoicesService.listTemplates();
  }

  @Get('templates/:type')
  @ApiOperation({ summary: 'Récupérer le template d\'un type de facture' })
  @ApiOkResponse({
    description: 'Template trouvé',
    type: InvoiceTemplateResponseDto,
  })
  getTemplate(@Param('type') type: string): Promise<InvoiceTemplateResponseDto> {
    return this.invoicesService.getTemplate(type);
  }

  @Put('templates/:type')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Créer ou mettre à jour le template d\'un type de facture' })
  @ApiOkResponse({
    description: 'Template upserté',
    type: InvoiceTemplateResponseDto,
  })
  upsertTemplate(
    @Param('type') type: string,
    @Body() dto: UpsertInvoiceTemplateDto,
  ): Promise<InvoiceTemplateResponseDto> {
    return this.invoicesService.upsertTemplate(type, dto);
  }

  // Static "document-templates" routes MUST stay above @Get(':id')
  // otherwise Nest treats "document-templates" as an invoice id → data: null.
  @Get('document-templates')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Lister les templates document de facture' })
  @ApiOkResponse({
    description: 'Liste des templates (tableau vide si aucun)',
    type: InvoiceDocumentTemplateResponseDto,
    isArray: true,
  })
  listDocumentTemplates(): Promise<InvoiceDocumentTemplateResponseDto[]> {
    return this.documentTemplatesService.list();
  }

  @Post('document-templates')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Créer un template document de facture' })
  @ApiCreatedResponse({
    description: 'Template créé',
    type: InvoiceDocumentTemplateResponseDto,
  })
  createDocumentTemplate(
    @Body() dto: CreateInvoiceDocumentTemplateDto,
  ): Promise<InvoiceDocumentTemplateResponseDto> {
    return this.documentTemplatesService.create(dto);
  }

  @Get('document-templates/:id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Récupérer un template document de facture' })
  @ApiOkResponse({
    description: 'Template trouvé',
    type: InvoiceDocumentTemplateResponseDto,
  })
  getDocumentTemplate(
    @Param('id') id: string,
  ): Promise<InvoiceDocumentTemplateResponseDto> {
    return this.documentTemplatesService.findOne(id);
  }

  @Patch('document-templates/:id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Mettre à jour un template document de facture' })
  @ApiOkResponse({
    description: 'Template mis à jour',
    type: InvoiceDocumentTemplateResponseDto,
  })
  updateDocumentTemplate(
    @Param('id') id: string,
    @Body() dto: UpdateInvoiceDocumentTemplateDto,
  ): Promise<InvoiceDocumentTemplateResponseDto> {
    return this.documentTemplatesService.update(id, dto);
  }

  @Delete('document-templates/:id')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer un template document de facture' })
  @ApiNoContentResponse({ description: 'Template supprimé' })
  async removeDocumentTemplate(@Param('id') id: string): Promise<void> {
    await this.documentTemplatesService.remove(id);
  }

  @Post('document-templates/:id/set-default')
  @UseGuards(AdminGuard)
  @ApiOperation({
    summary: 'Définir le template comme défaut pour son scope (type ou global)',
  })
  @ApiOkResponse({
    description: 'Template défini comme défaut',
    type: InvoiceDocumentTemplateResponseDto,
  })
  setDefaultDocumentTemplate(
    @Param('id') id: string,
  ): Promise<InvoiceDocumentTemplateResponseDto> {
    return this.documentTemplatesService.setDefault(id);
  }

  @Post('document-templates/:id/preview')
  @UseGuards(AdminGuard)
  @ApiOperation({
    summary: 'Prévisualiser le template en HTML (mock ou facture réelle)',
  })
  @ApiOkResponse({
    description: 'Aperçu HTML',
    type: InvoiceDocumentTemplatePreviewResponseDto,
  })
  previewDocumentTemplate(
    @Param('id') id: string,
    @Body() dto: PreviewInvoiceDocumentTemplateDto,
  ): Promise<InvoiceDocumentTemplatePreviewResponseDto> {
    return this.documentTemplatesService.preview(id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lister les factures' })
  @ApiPaginatedResponse(InvoiceResponseDto, 'Liste paginee des factures')
  findAll(@Query() query: ListQueryDto) {
    return this.invoicesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer une facture' })
  @ApiOkResponse({ description: 'Facture trouvée', type: InvoiceResponseDto })
  findOne(@Param('id') id: string) {
    return this.invoicesService.findOne(id);
  }

  @Get(':id/documents')
  @ApiOperation({ summary: 'Lister les fichiers uploadés sur une facture' })
  @ApiOkResponse({ description: 'Documents de la facture' })
  listDocuments(@Param('id') id: string) {
    return this.invoicesService.listDocuments(id);
  }

  @Post(':id/documents')
  @UseGuards(AdminGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
      fileFilter: (_, file, cb) => {
        const allowed = [
          'application/pdf',
          'image/png',
          'image/jpeg',
          'image/webp',
        ];
        cb(null, allowed.includes(file.mimetype));
      },
    }),
  )
  @ApiOperation({ summary: 'Uploader une facture signée/cachetée (PDF ou image)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        kind: {
          type: 'string',
          enum: ['SIGNED', 'STAMPED', 'SIGNED_AND_STAMPED', 'OTHER'],
        },
        note: { type: 'string' },
        file: {
          type: 'string',
          format: 'binary',
        },
      },
      required: ['kind', 'file'],
    },
  })
  @ApiCreatedResponse({ description: 'Document uploadé' })
  uploadDocument(
    @Param('id') id: string,
    @Body() dto: UploadInvoiceDocumentDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    return this.invoicesService.uploadDocument(id, dto, file, user.sub);
  }

  @Get(':id/documents/:documentId/download')
  @ApiOperation({ summary: 'Télécharger un document uploadé (signé/cacheté)' })
  @ApiParam({ name: 'id', description: 'ID facture' })
  @ApiParam({ name: 'documentId', description: 'ID document facture' })
  async downloadDocument(
    @Param('id') id: string,
    @Param('documentId') documentId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const doc = await this.invoicesService.getDocumentForDownload(id, documentId);
    res.setHeader('Content-Type', doc.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${sanitizeFilename(doc.originalName)}"`,
    );
    return new StreamableFile(doc.buffer);
  }

  @Post(':id/documents/:documentId/replace')
  @UseGuards(AdminGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
      fileFilter: (_, file, cb) => {
        const allowed = [
          'application/pdf',
          'image/png',
          'image/jpeg',
          'image/webp',
        ];
        cb(null, allowed.includes(file.mimetype));
      },
    }),
  )
  @ApiOperation({ summary: 'Remplacer un document facture (nouvelle version)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
      required: ['file'],
    },
  })
  replaceDocument(
    @Param('id') id: string,
    @Param('documentId') documentId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    return this.invoicesService.replaceDocument(id, documentId, file, user.sub);
  }

  @Delete(':id/documents/:documentId')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Supprimer un document facture' })
  @ApiOkResponse({ description: 'Document facture supprimé' })
  deleteDocument(
    @Param('id') id: string,
    @Param('documentId') documentId: string,
  ) {
    return this.invoicesService.deleteDocument(id, documentId);
  }

  @Post()
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Créer une facture' })
  @ApiCreatedResponse({ description: 'Facture créée', type: InvoiceResponseDto })
  create(
    @Body() dto: CreateInvoiceDto,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    return this.invoicesService.create(dto, user.sub);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Mettre à jour une facture' })
  @ApiOkResponse({ description: 'Facture mise à jour', type: InvoiceResponseDto })
  update(@Param('id') id: string, @Body() dto: UpdateInvoiceDto) {
    return this.invoicesService.update(id, dto);
  }

  @Patch(':id/mark-paid')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Marquer une facture comme intégralement payée (raccourci)' })
  @ApiOkResponse({
    description: 'Facture marquée payée',
    type: InvoiceResponseDto,
  })
  markPaid(
    @Param('id') id: string,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    return this.invoicesService.markPaidWithAudit(id, user.sub);
  }

  @Post(':id/record-payment')
  @UseGuards(AdminGuard)
  @ApiOperation({
    summary: 'Enregistrer un paiement (acompte ou solde)',
    description:
      'Ajoute un montant encaissé. Passe automatiquement en PARTIALLY_PAID ' +
      'ou PAID selon si le total TTC est atteint.',
  })
  @ApiOkResponse({ description: 'Paiement enregistré', type: InvoiceResponseDto })
  recordPayment(
    @Param('id') id: string,
    @Body() dto: RecordPaymentDto,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    return this.invoicesService.recordPayment(id, dto, user.sub);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Supprimer une facture' })
  @ApiOkResponse({ description: 'Facture supprimée' })
  remove(@Param('id') id: string) {
    return this.invoicesService.remove(id);
  }
}
