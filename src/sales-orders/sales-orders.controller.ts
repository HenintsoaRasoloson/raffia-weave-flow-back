import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../auth/guards/admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ListQueryDto } from '../common/dto/list-query.dto';
import { ApiPaginatedResponse } from '../common/swagger/api-paginated-response.decorator';
import { CreateSalesOrderDto } from './dto/create-sales-order.dto';
import { SalesOrderResponseDto } from './dto/sales-order-response.dto';
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

  @Post()
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Créer une commande' })
  @ApiCreatedResponse({ description: 'Commande créée', type: SalesOrderResponseDto })
  create(@Body() dto: CreateSalesOrderDto) {
    return this.salesOrdersService.create(dto);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Mettre à jour une commande' })
  @ApiOkResponse({ description: 'Commande mise à jour', type: SalesOrderResponseDto })
  update(@Param('id') id: string, @Body() dto: UpdateSalesOrderDto) {
    return this.salesOrdersService.update(id, dto);
  }

  @Patch(':id/status')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Transition métier du statut commande' })
  @ApiOkResponse({
    description: 'Statut commande mis à jour',
    type: SalesOrderResponseDto,
  })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateSalesOrderStatusDto) {
    return this.salesOrdersService.updateStatus(id, dto);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Supprimer une commande' })
  @ApiOkResponse({ description: 'Commande supprimée' })
  remove(@Param('id') id: string) {
    return this.salesOrdersService.remove(id);
  }
}
