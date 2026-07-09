import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../auth/guards/admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ListQueryDto } from '../common/dto/list-query.dto';
import { ApiPaginatedResponse } from '../common/swagger/api-paginated-response.decorator';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { PurchaseOrderResponseDto } from './dto/purchase-order-response.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { PurchaseOrdersService } from './purchase-orders.service';

@ApiTags('Achats')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly purchaseOrdersService: PurchaseOrdersService) {}

  @Get()
  @ApiOperation({ summary: 'Lister les bons de commande' })
  @ApiPaginatedResponse(PurchaseOrderResponseDto, 'Liste paginee des bons de commande')
  findAll(@Query() query: ListQueryDto) {
    return this.purchaseOrdersService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un bon de commande' })
  @ApiOkResponse({ type: PurchaseOrderResponseDto })
  findOne(@Param('id') id: string) {
    return this.purchaseOrdersService.findOne(id);
  }

  @Post()
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Créer un bon de commande' })
  @ApiCreatedResponse({ type: PurchaseOrderResponseDto })
  create(@Body() dto: CreatePurchaseOrderDto) {
    return this.purchaseOrdersService.create(dto);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Mettre à jour un bon de commande' })
  @ApiOkResponse({ type: PurchaseOrderResponseDto })
  update(@Param('id') id: string, @Body() dto: UpdatePurchaseOrderDto) {
    return this.purchaseOrdersService.update(id, dto);
  }

  @Patch(':id/mark-received')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Marquer un bon de commande comme reçu' })
  @ApiOkResponse({ type: PurchaseOrderResponseDto })
  markReceived(@Param('id') id: string) {
    return this.purchaseOrdersService.markReceived(id);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Supprimer un bon de commande' })
  remove(@Param('id') id: string) {
    return this.purchaseOrdersService.remove(id);
  }
}
