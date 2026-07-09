import {
  Body,
  Controller,
  Delete,
  Get,
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
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { InvoiceResponseDto } from './dto/invoice-response.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { UploadInvoiceDocumentDto } from './dto/upload-invoice-document.dto';
import { UpsertInvoiceTemplateDto } from './dto/upsert-invoice-template.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { InvoicesService } from './invoices.service';

function sanitizeFilename(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_');
}

@ApiTags('Factures')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get('templates')
  @ApiOperation({ summary: 'Lister les templates de facture configurés' })
  @ApiOkResponse({ description: 'Templates de facture' })
  listTemplates() {
    return this.invoicesService.listTemplates();
  }

  @Get('templates/:type')
  @ApiOperation({ summary: 'Récupérer le template d\'un type de facture' })
  @ApiOkResponse({ description: 'Template trouvé' })
  getTemplate(@Param('type') type: string) {
    return this.invoicesService.getTemplate(type);
  }

  @Put('templates/:type')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Créer ou mettre à jour le template d\'un type de facture' })
  @ApiOkResponse({ description: 'Template upserté' })
  upsertTemplate(
    @Param('type') type: string,
    @Body() dto: UpsertInvoiceTemplateDto,
  ) {
    return this.invoicesService.upsertTemplate(type, dto);
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
