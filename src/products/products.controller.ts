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
  UploadedFiles,
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
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAccessPayload } from '../auth/auth.types';
import { AdminGuard } from '../auth/guards/admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ListQueryDto } from '../common/dto/list-query.dto';
import { ApiPaginatedResponse } from '../common/swagger/api-paginated-response.decorator';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductResponseDto } from './dto/product-response.dto';
import { UploadProductImagesDto } from './dto/upload-product-images.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

@ApiTags('Produits')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'Lister les produits' })
  @ApiPaginatedResponse(ProductResponseDto, 'Liste paginee des produits')
  findAll(@Query() query: ListQueryDto) {
    return this.productsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un produit' })
  @ApiOkResponse({ description: 'Produit trouvé', type: ProductResponseDto })
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Get(':id/images')
  @ApiOperation({ summary: 'Lister les images d\'un produit' })
  @ApiOkResponse({ description: 'Images du produit' })
  listImages(@Param('id') id: string) {
    return this.productsService.listImages(id);
  }

  @Post(':id/images')
  @UseGuards(AdminGuard)
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_, file, cb) => {
        const allowed = ['image/png', 'image/jpeg', 'image/webp'];
        cb(null, allowed.includes(file.mimetype));
      },
    }),
  )
  @ApiOperation({ summary: 'Uploader plusieurs images produit (compression active)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        tag: { type: 'string' },
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
      required: ['files'],
    },
  })
  @ApiCreatedResponse({ description: 'Images uploadées' })
  uploadImages(
    @Param('id') id: string,
    @Body() _dto: UploadProductImagesDto,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() user: JwtAccessPayload,
  ) {
    return this.productsService.uploadImages(id, files, user.sub);
  }

  @Get(':id/images/:imageId')
  @ApiOperation({ summary: 'Lire une image produit (décompression à la volée)' })
  async getImage(
    @Param('id') id: string,
    @Param('imageId') imageId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const image = await this.productsService.getImageBinary(id, imageId);
    res.setHeader('Content-Type', image.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${image.originalName}"`);
    return new StreamableFile(image.buffer);
  }

  @Post(':id/images/:imageId/replace')
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
  @ApiOperation({ summary: 'Remplacer une image produit (nouvelle version)' })
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
  replaceImage(
    @Param('id') id: string,
    @Param('imageId') imageId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    return this.productsService.replaceImage(id, imageId, file, user.sub);
  }

  @Delete(':id/images/:imageId')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Supprimer une image produit' })
  @ApiOkResponse({ description: 'Image supprimée' })
  deleteImage(
    @Param('id') id: string,
    @Param('imageId') imageId: string,
  ) {
    return this.productsService.deleteImage(id, imageId);
  }

  @Post()
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Créer un produit' })
  @ApiCreatedResponse({ description: 'Produit créé', type: ProductResponseDto })
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Mettre à jour un produit' })
  @ApiOkResponse({ description: 'Produit mis à jour', type: ProductResponseDto })
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Supprimer un produit' })
  @ApiOkResponse({ description: 'Produit supprimé' })
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}
