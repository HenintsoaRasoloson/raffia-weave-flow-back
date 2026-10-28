import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
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
  ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  RolesAllowed,
  SALES_ROLES,
} from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAccessPayload } from '../auth/auth.types';
import { ListQueryDto } from '../common/dto/list-query.dto';
import { ApiPaginatedResponse } from '../common/swagger/api-paginated-response.decorator';
import { CreateSalesOrderDto } from './dto/create-sales-order.dto';
import { SalesOrderResponseDto } from './dto/sales-order-response.dto';
import { UploadBatDocumentDto } from './dto/upload-bat-document.dto';
import { UpdateSalesOrderDto } from './dto/update-sales-order.dto';
import { UpdateSalesOrderStatusDto } from './dto/update-sales-order-status.dto';
import { SalesOrdersService } from './sales-orders.service';

@ApiTags('Commandes')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('sales-orders')
export class SalesOrdersController {
  constructor(private readonly salesOrdersService: SalesOrdersService) {}

  @Get()
  @ApiOperation({ summary: 'Lister les commandes' })
  @ApiPaginatedResponse(SalesOrderResponseDto, 'Liste paginee des commandes')
  findAll(@Query() query: ListQueryDto) {
    return this.salesOrdersService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer une commande' })
  @ApiOkResponse({ description: 'Commande trouvée', type: SalesOrderResponseDto })
  findOne(@Param('id') id: string) {
    return this.salesOrdersService.findOne(id);
  }

  @Get(':id/bat-documents')
  @ApiOperation({ summary: 'Lister les documents BAT d\'une commande' })
  @ApiOkResponse({ description: 'Documents BAT' })
  listBatDocuments(@Param('id') id: string) {
    return this.salesOrdersService.listBatDocuments(id);
  }

  @Post(':id/bat-documents')
  @RolesAllowed(...SALES_ROLES)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 20 * 1024 * 1024 },
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
  @ApiOperation({ summary: 'Uploader un document BAT (aperçu, signé, etc.)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        kind: {
          type: 'string',
          enum: ['PREVIEW', 'SENT_TO_CLIENT', 'APPROVED_SIGNED', 'OTHER'],
        },
        note: { type: 'string' },
        file: { type: 'string', format: 'binary' },
      },
      required: ['kind', 'file'],
    },
  })
  @ApiCreatedResponse({ description: 'Document BAT uploadé' })
  uploadBatDocument(
    @Param('id') id: string,
    @Body() dto: UploadBatDocumentDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    return this.salesOrdersService.uploadBatDocument(id, dto, file, user.sub);
  }

  @Get(':id/bat-documents/:documentId/download')
  @ApiOperation({ summary: 'Télécharger un document BAT (décompression à la volée)' })
  async downloadBatDocument(
    @Param('id') id: string,
    @Param('documentId') documentId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const document = await this.salesOrdersService.getBatDocumentBinary(
      id,
      documentId,
    );
    res.setHeader('Content-Type', document.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${document.originalName}"`,
    );
    return new StreamableFile(document.buffer);
  }

  @Post(':id/bat-documents/:documentId/replace')
  @RolesAllowed(...SALES_ROLES)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 20 * 1024 * 1024 },
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
  @ApiOperation({ summary: 'Remplacer un document BAT (nouvelle version)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  replaceBatDocument(
    @Param('id') id: string,
    @Param('documentId') documentId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    return this.salesOrdersService.replaceBatDocument(
      id,
      documentId,
      file,
      user.sub,
    );
  }

  @Delete(':id/bat-documents/:documentId')
  @RolesAllowed(...SALES_ROLES)
  @ApiOperation({ summary: 'Supprimer un document BAT' })
  @ApiOkResponse({ description: 'Document BAT supprimé' })
  deleteBatDocument(
    @Param('id') id: string,
    @Param('documentId') documentId: string,
  ) {
    return this.salesOrdersService.deleteBatDocument(id, documentId);
  }

  @Post()
  @RolesAllowed(...SALES_ROLES)
  @ApiOperation({ summary: 'Créer une commande' })
  @ApiCreatedResponse({ description: 'Commande créée', type: SalesOrderResponseDto })
  create(
    @Body() dto: CreateSalesOrderDto,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    return this.salesOrdersService.create(dto, user.sub);
  }

  @Patch(':id')
  @RolesAllowed(...SALES_ROLES)
  @ApiOperation({ summary: 'Mettre à jour une commande' })
  @ApiOkResponse({ description: 'Commande mise à jour', type: SalesOrderResponseDto })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSalesOrderDto,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    return this.salesOrdersService.update(id, dto, user.sub);
  }

  @Patch(':id/status')
  @RolesAllowed(...SALES_ROLES)
  @ApiOperation({ summary: 'Transition métier du statut commande' })
  @ApiOkResponse({
    description: 'Statut commande mis à jour',
    type: SalesOrderResponseDto,
  })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateSalesOrderStatusDto,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    return this.salesOrdersService.updateStatus(id, dto, user.sub);
  }

  @Patch(':id/bat-send')
  @RolesAllowed(...SALES_ROLES)
  @ApiOperation({
    summary: 'Marquer le BAT comme envoyé au client',
    description:
      'Enregistre la date d\'envoi du Bon à Tirer (modèle/visuel) au client. ' +
      'Nécessite batRequired = true sur la commande.',
  })
  @ApiOkResponse({ description: 'BAT marqué envoyé', type: SalesOrderResponseDto })
  sendBat(
    @Param('id') id: string,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    return this.salesOrdersService.sendBat(id, user.sub);
  }

  @Patch(':id/bat-approve')
  @RolesAllowed(...SALES_ROLES)
  @ApiOperation({
    summary: 'Enregistrer l\'approbation du BAT par le client',
    description:
      'Valide que le client a approuvé le Bon à Tirer. ' +
      'Débloque ensuite le passage en statut IN_PRODUCTION.',
  })
  @ApiOkResponse({ description: 'BAT approuvé', type: SalesOrderResponseDto })
  approveBat(
    @Param('id') id: string,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    return this.salesOrdersService.approveBat(id, user.sub);
  }

  @Delete(':id')
  @RolesAllowed(...SALES_ROLES)
  @ApiOperation({ summary: 'Supprimer une commande' })
  @ApiOkResponse({ description: 'Commande supprimée' })
  remove(@Param('id') id: string) {
    return this.salesOrdersService.remove(id);
  }
}
