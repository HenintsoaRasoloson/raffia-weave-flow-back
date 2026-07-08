import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CreateProductionOrderDto } from './dto/create-production-order.dto';
import { UpdateProductionProgressDto } from './dto/update-production-progress.dto';
import { UpdateProductionOrderDto } from './dto/update-production-order.dto';
import { ProductionOrdersService } from './production-orders.service';

@ApiTags('Production')
@Controller('production-orders')
export class ProductionOrdersController {
  constructor(
    private readonly productionOrdersService: ProductionOrdersService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lister les ordres de fabrication' })
  @ApiOkResponse({ description: 'Liste des OF' })
  findAll() {
    return this.productionOrdersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un ordre de fabrication' })
  @ApiOkResponse({ description: 'OF trouvé' })
  findOne(@Param('id') id: string) {
    return this.productionOrdersService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Créer un ordre de fabrication' })
  @ApiCreatedResponse({ description: 'OF créé' })
  create(@Body() dto: CreateProductionOrderDto) {
    return this.productionOrdersService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Mettre à jour un ordre de fabrication' })
  @ApiOkResponse({ description: 'OF mis à jour' })
  update(@Param('id') id: string, @Body() dto: UpdateProductionOrderDto) {
    return this.productionOrdersService.update(id, dto);
  }

  @Patch(':id/progress')
  @ApiOperation({ summary: 'Mettre à jour l avancement métier d un OF' })
  @ApiOkResponse({ description: 'Progression OF mise à jour' })
  updateProgress(
    @Param('id') id: string,
    @Body() dto: UpdateProductionProgressDto,
  ) {
    return this.productionOrdersService.updateProgress(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un ordre de fabrication' })
  @ApiOkResponse({ description: 'OF supprimé' })
  remove(@Param('id') id: string) {
    return this.productionOrdersService.remove(id);
  }
}
