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
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { AdminGuard } from '../auth/guards/admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  RolesAllowed,
  SALES_ROLES,
} from '../auth/decorators/roles.decorator';
import { ListQueryDto } from '../common/dto/list-query.dto';
import { ApiPaginatedResponse } from '../common/swagger/api-paginated-response.decorator';
import { CatalogSharesService } from './catalog-shares.service';
import { CatalogShareResponseDto } from './dto/catalog-share-response.dto';
import { CreateCatalogShareDto } from './dto/create-catalog-share.dto';
import { ReplaceCatalogShareProductsDto } from './dto/replace-catalog-share-products.dto';
import { UpdateCatalogShareDto } from './dto/update-catalog-share.dto';

@ApiTags('Catalogue personnalisé')
@Controller('catalog-shares')
export class CatalogSharesController {
  constructor(private readonly catalogSharesService: CatalogSharesService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lister les catalogues partagés' })
  @ApiPaginatedResponse(
    CatalogShareResponseDto,
    'Liste paginee des catalogues partages',
  )
  findAll(@Query() query: ListQueryDto) {
    return this.catalogSharesService.findAll(query);
  }

  @Get('public/:token')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Consulter un catalogue partagé via token' })
  @ApiOkResponse({ type: CatalogShareResponseDto })
  getPublicByToken(@Param('token') token: string) {
    return this.catalogSharesService.getPublicByToken(token);
  }

  @Get('public/:token/products/:productId/images/:imageId')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({ summary: 'Lire une image produit d\'un catalogue public' })
  async getPublicProductImage(
    @Param('token') token: string,
    @Param('productId') productId: string,
    @Param('imageId') imageId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const image = await this.catalogSharesService.getPublicProductImage(
      token,
      productId,
      imageId,
    );
    res.setHeader('Content-Type', image.mimeType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${image.originalName}"`,
    );
    return new StreamableFile(image.buffer);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer un catalogue partagé' })
  @ApiOkResponse({ type: CatalogShareResponseDto })
  findOne(
    @Param('id') id: string,
  ): ReturnType<CatalogSharesService['findOne']> {
    return this.catalogSharesService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @RolesAllowed(...SALES_ROLES)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer un catalogue partagé' })
  @ApiCreatedResponse({ type: CatalogShareResponseDto })
  create(@Body() dto: CreateCatalogShareDto) {
    return this.catalogSharesService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @RolesAllowed(...SALES_ROLES)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mettre à jour un catalogue partagé' })
  @ApiOkResponse({ type: CatalogShareResponseDto })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCatalogShareDto,
  ): ReturnType<CatalogSharesService['update']> {
    return this.catalogSharesService.update(id, dto);
  }

  @Patch(':id/products')
  @UseGuards(JwtAuthGuard)
  @RolesAllowed(...SALES_ROLES)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remplacer les produits du catalogue partagé' })
  @ApiOkResponse({ type: CatalogShareResponseDto })
  replaceProducts(
    @Param('id') id: string,
    @Body() dto: ReplaceCatalogShareProductsDto,
  ) {
    return this.catalogSharesService.replaceProducts(id, dto);
  }

  @Delete(':id/products/:productId')
  @UseGuards(JwtAuthGuard)
  @RolesAllowed(...SALES_ROLES)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retirer un produit du catalogue partagé' })
  removeProduct(
    @Param('id') id: string,
    @Param('productId') productId: string,
  ) {
    return this.catalogSharesService.removeProduct(id, productId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Supprimer un catalogue partagé',
    description:
      'Autorisé uniquement si le statut n’est pas ACTIVE (EXPIRED ou REVOKED).',
  })
  @ApiOkResponse({ description: 'Catalogue partagé supprimé' })
  remove(@Param('id') id: string) {
    return this.catalogSharesService.remove(id);
  }
}
