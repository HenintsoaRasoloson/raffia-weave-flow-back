import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../auth/guards/admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ListQueryDto } from '../common/dto/list-query.dto';
import { ApiPaginatedResponse } from '../common/swagger/api-paginated-response.decorator';
import { CreateProductionOrderDto } from './dto/create-production-order.dto';
import { ProductionOrderResponseDto } from './dto/production-order-response.dto';
import { UpdateProductionOrderDto } from './dto/update-production-order.dto';
import { UpdateProductionProgressDto } from './dto/update-production-progress.dto';
import { ProductionOrdersService } from './production-orders.service';

@ApiTags('Production')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
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
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Créer un ordre de fabrication' })
  @ApiCreatedResponse({ description: 'OF créé', type: ProductionOrderResponseDto })
  create(@Body() dto: CreateProductionOrderDto) {
    return this.productionOrdersService.create(dto);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Mettre à jour un ordre de fabrication' })
  @ApiOkResponse({ description: 'OF mis à jour', type: ProductionOrderResponseDto })
  update(@Param('id') id: string, @Body() dto: UpdateProductionOrderDto) {
    return this.productionOrdersService.update(id, dto);
  }

  @Patch(':id/progress')
  @UseGuards(AdminGuard)
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
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Supprimer un ordre de fabrication' })
  @ApiOkResponse({ description: 'OF supprimé' })
  remove(@Param('id') id: string) {
    return this.productionOrdersService.remove(id);
  }
}
