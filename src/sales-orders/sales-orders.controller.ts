import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../auth/guards/admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAccessPayload } from '../auth/auth.types';
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
  create(
    @Body() dto: CreateSalesOrderDto,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    return this.salesOrdersService.create(dto, user.sub);
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
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateSalesOrderStatusDto,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    return this.salesOrdersService.updateStatus(id, dto, user.sub);
  }

  @Patch(':id/bat-send')
  @UseGuards(AdminGuard)
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
  @UseGuards(AdminGuard)
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
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Supprimer une commande' })
  @ApiOkResponse({ description: 'Commande supprimée' })
  remove(@Param('id') id: string) {
    return this.salesOrdersService.remove(id);
  }
}
