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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAccessPayload } from '../auth/auth.types';
import { AdminGuard } from '../auth/guards/admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ListQueryDto } from '../common/dto/list-query.dto';
import { ApiPaginatedResponse } from '../common/swagger/api-paginated-response.decorator';
import { ClientsService } from './clients.service';
import { ClientResponseDto } from './dto/client-response.dto';
import { CreateClientDto } from './dto/create-client.dto';
import { ReplaceClientFiscalCardDto } from './dto/replace-client-fiscal-card.dto';
import { UploadClientFiscalCardDto } from './dto/upload-client-fiscal-card.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@ApiTags('Clients')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  @ApiOperation({ summary: 'Lister les clients' })
  @ApiPaginatedResponse(ClientResponseDto, 'Liste paginee des clients')
  findAll(@Query() query: ListQueryDto) {
    return this.clientsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un client' })
  @ApiOkResponse({ description: 'Client trouvé', type: ClientResponseDto })
  findOne(@Param('id') id: string) {
    return this.clientsService.findOne(id);
  }

  @Get(':id/fiscal-cards')
  @ApiOperation({ summary: 'Lister les cartes fiscales d\'un client (B2B)' })
  @ApiOkResponse({ description: 'Cartes fiscales du client' })
  listFiscalCards(@Param('id') id: string) {
    return this.clientsService.listFiscalCards(id);
  }

  @Post(':id/fiscal-cards')
  @UseGuards(AdminGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_, file, cb) => {
        const allowed = ['image/png', 'image/jpeg', 'image/webp'];
        cb(null, allowed.includes(file.mimetype));
      },
    }),
  )
  @ApiOperation({ summary: 'Uploader une carte fiscale (image) pour un client B2B' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        validUntil: { type: 'string', format: 'date-time' },
        note: { type: 'string' },
        file: { type: 'string', format: 'binary' },
      },
      required: ['validUntil', 'file'],
    },
  })
  @ApiCreatedResponse({ description: 'Carte fiscale uploadée' })
  uploadFiscalCard(
    @Param('id') id: string,
    @Body() dto: UploadClientFiscalCardDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    return this.clientsService.uploadFiscalCard(id, dto, file, user.sub);
  }

  @Get(':id/fiscal-cards/:cardId')
  @ApiOperation({ summary: 'Lire la carte fiscale (décompression à la volée)' })
  async getFiscalCard(
    @Param('id') id: string,
    @Param('cardId') cardId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const card = await this.clientsService.getFiscalCardBinary(id, cardId);
    res.setHeader('Content-Type', card.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${card.originalName}"`);
    return new StreamableFile(card.buffer);
  }

  @Post(':id/fiscal-cards/:cardId/replace')
  @UseGuards(AdminGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_, file, cb) => {
        const allowed = ['image/png', 'image/jpeg', 'image/webp'];
        cb(null, allowed.includes(file.mimetype));
      },
    }),
  )
  @ApiOperation({ summary: 'Remplacer une carte fiscale (nouvelle version)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        validUntil: { type: 'string', format: 'date-time' },
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  replaceFiscalCard(
    @Param('id') id: string,
    @Param('cardId') cardId: string,
    @Body() dto: ReplaceClientFiscalCardDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    return this.clientsService.replaceFiscalCard(
      id,
      cardId,
      file,
      user.sub,
      dto.validUntil,
    );
  }

  @Delete(':id/fiscal-cards/:cardId')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Supprimer une carte fiscale' })
  @ApiOkResponse({ description: 'Carte fiscale supprimée' })
  deleteFiscalCard(
    @Param('id') id: string,
    @Param('cardId') cardId: string,
  ) {
    return this.clientsService.deleteFiscalCard(id, cardId);
  }

  @Post()
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Créer un client' })
  @ApiCreatedResponse({ description: 'Client créé', type: ClientResponseDto })
  create(@Body() dto: CreateClientDto) {
    return this.clientsService.create(dto);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Mettre à jour un client' })
  @ApiOkResponse({ description: 'Client mis à jour', type: ClientResponseDto })
  update(@Param('id') id: string, @Body() dto: UpdateClientDto) {
    return this.clientsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Supprimer un client' })
  @ApiOkResponse({ description: 'Client supprimé' })
  remove(@Param('id') id: string) {
    return this.clientsService.remove(id);
  }
}
