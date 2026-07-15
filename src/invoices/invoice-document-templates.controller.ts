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
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AdminGuard } from '../auth/guards/admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateInvoiceDocumentTemplateDto } from './dto/create-invoice-document-template.dto';
import { InvoiceDocumentTemplatePreviewResponseDto } from './dto/invoice-document-template-preview-response.dto';
import { InvoiceDocumentTemplateResponseDto } from './dto/invoice-document-template-response.dto';
import { PreviewInvoiceDocumentTemplateDto } from './dto/preview-invoice-document-template.dto';
import { UpdateInvoiceDocumentTemplateDto } from './dto/update-invoice-document-template.dto';
import { InvoiceDocumentTemplatesService } from './invoice-document-templates.service';

@ApiTags('Factures — Templates document')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
@Controller('invoices/document-templates')
export class InvoiceDocumentTemplatesController {
  constructor(
    private readonly documentTemplatesService: InvoiceDocumentTemplatesService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lister les templates document de facture' })
  @ApiOkResponse({
    description: 'Liste des templates (tableau vide si aucun)',
    type: InvoiceDocumentTemplateResponseDto,
    isArray: true,
  })
  list(): Promise<InvoiceDocumentTemplateResponseDto[]> {
    return this.documentTemplatesService.list();
  }

  @Post()
  @ApiOperation({ summary: 'Créer un template document de facture' })
  @ApiCreatedResponse({
    description: 'Template créé',
    type: InvoiceDocumentTemplateResponseDto,
  })
  create(
    @Body() dto: CreateInvoiceDocumentTemplateDto,
  ): Promise<InvoiceDocumentTemplateResponseDto> {
    return this.documentTemplatesService.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un template document de facture' })
  @ApiOkResponse({
    description: 'Template trouvé',
    type: InvoiceDocumentTemplateResponseDto,
  })
  findOne(
    @Param('id') id: string,
  ): Promise<InvoiceDocumentTemplateResponseDto> {
    return this.documentTemplatesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Mettre à jour un template document de facture' })
  @ApiOkResponse({
    description: 'Template mis à jour',
    type: InvoiceDocumentTemplateResponseDto,
  })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateInvoiceDocumentTemplateDto,
  ): Promise<InvoiceDocumentTemplateResponseDto> {
    return this.documentTemplatesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer un template document de facture' })
  @ApiNoContentResponse({ description: 'Template supprimé' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.documentTemplatesService.remove(id);
  }

  @Post(':id/set-default')
  @ApiOperation({
    summary: 'Définir le template comme défaut pour son scope (type ou global)',
  })
  @ApiOkResponse({
    description: 'Template défini comme défaut',
    type: InvoiceDocumentTemplateResponseDto,
  })
  setDefault(
    @Param('id') id: string,
  ): Promise<InvoiceDocumentTemplateResponseDto> {
    return this.documentTemplatesService.setDefault(id);
  }

  @Post(':id/preview')
  @ApiOperation({
    summary: 'Prévisualiser le template en HTML (mock ou facture réelle)',
  })
  @ApiOkResponse({
    description: 'Aperçu HTML',
    type: InvoiceDocumentTemplatePreviewResponseDto,
  })
  preview(
    @Param('id') id: string,
    @Body() dto: PreviewInvoiceDocumentTemplateDto,
  ): Promise<InvoiceDocumentTemplatePreviewResponseDto> {
    return this.documentTemplatesService.preview(id, dto);
  }
}
