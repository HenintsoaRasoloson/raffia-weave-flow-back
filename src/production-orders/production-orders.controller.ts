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
import { ApiPaginatedResponse } from '../common/swagger/api-paginated-response.decorator';
import { ListQueryDto } from '../common/dto/list-query.dto';
import { CreateProductionOrderDto } from './dto/create-production-order.dto';
import { ProductionOrderResponseDto } from './dto/production-order-response.dto';
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
  @ApiPaginatedResponse(
    ProductionOrderResponseDto,
    'Liste paginee des ordres de fabrication',
  )
  findAll(@Query() query: ListQueryDto) {
    return this.productionOrdersService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un ordre de fabrication' })
  @ApiOkResponse({ description: 'OF trouvé', type: ProductionOrderResponseDto })
  findOne(@Param('id') id: string) {
    return this.productionOrdersService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Créer un ordre de fabrication' })
  @ApiCreatedResponse({ description: 'OF créé', type: ProductionOrderResponseDto })
  create(@Body() dto: CreateProductionOrderDto) {
    return this.productionOrdersService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Mettre à jour un ordre de fabrication' })
  @ApiOkResponse({ description: 'OF mis à jour', type: ProductionOrderResponseDto })
  update(@Param('id') id: string, @Body() dto: UpdateProductionOrderDto) {
    return this.productionOrdersService.update(id, dto);
  }

  @Patch(':id/progress')
  @ApiOperation({ summary: 'Mettre à jour l avancement métier d un OF' })
  @ApiOkResponse({
    description: 'Progression OF mise à jour',
    type: ProductionOrderResponseDto,
  })
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
