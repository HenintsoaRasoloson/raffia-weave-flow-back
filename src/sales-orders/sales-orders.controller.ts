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
import { CreateSalesOrderDto } from './dto/create-sales-order.dto';
import { UpdateSalesOrderStatusDto } from './dto/update-sales-order-status.dto';
import { UpdateSalesOrderDto } from './dto/update-sales-order.dto';
import { SalesOrdersService } from './sales-orders.service';

@ApiTags('Commandes')
@Controller('sales-orders')
export class SalesOrdersController {
  constructor(private readonly salesOrdersService: SalesOrdersService) {}

  @Get()
  @ApiOperation({ summary: 'Lister les commandes' })
  @ApiOkResponse({ description: 'Liste des commandes' })
  findAll() {
    return this.salesOrdersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer une commande' })
  @ApiOkResponse({ description: 'Commande trouvée' })
  findOne(@Param('id') id: string) {
    return this.salesOrdersService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Créer une commande' })
  @ApiCreatedResponse({ description: 'Commande créée' })
  create(@Body() dto: CreateSalesOrderDto) {
    return this.salesOrdersService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Mettre à jour une commande' })
  @ApiOkResponse({ description: 'Commande mise à jour' })
  update(@Param('id') id: string, @Body() dto: UpdateSalesOrderDto) {
    return this.salesOrdersService.update(id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Transition métier du statut commande' })
  @ApiOkResponse({ description: 'Statut commande mis à jour' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateSalesOrderStatusDto) {
    return this.salesOrdersService.updateStatus(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer une commande' })
  @ApiOkResponse({ description: 'Commande supprimée' })
  remove(@Param('id') id: string) {
    return this.salesOrdersService.remove(id);
  }
}
