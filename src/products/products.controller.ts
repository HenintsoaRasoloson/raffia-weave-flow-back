import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ListQueryDto } from '../common/dto/list-query.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

@ApiTags('Produits')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'Lister les produits' })
  @ApiOkResponse({ description: 'Liste des produits' })
  findAll(@Query() query: ListQueryDto) {
    return this.productsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un produit' })
  @ApiOkResponse({ description: 'Produit trouvé' })
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Créer un produit' })
  @ApiCreatedResponse({ description: 'Produit créé' })
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Mettre à jour un produit' })
  @ApiOkResponse({ description: 'Produit mis à jour' })
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un produit' })
  @ApiOkResponse({ description: 'Produit supprimé' })
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}
