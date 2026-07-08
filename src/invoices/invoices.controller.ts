import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../auth/guards/admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ListQueryDto } from '../common/dto/list-query.dto';
import { ApiPaginatedResponse } from '../common/swagger/api-paginated-response.decorator';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { InvoiceResponseDto } from './dto/invoice-response.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { InvoicesService } from './invoices.service';

@ApiTags('Factures')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  @ApiOperation({ summary: 'Lister les factures' })
  @ApiPaginatedResponse(InvoiceResponseDto, 'Liste paginee des factures')
  findAll(@Query() query: ListQueryDto) {
    return this.invoicesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer une facture' })
  @ApiOkResponse({ description: 'Facture trouvée', type: InvoiceResponseDto })
  findOne(@Param('id') id: string) {
    return this.invoicesService.findOne(id);
  }

  @Post()
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Créer une facture' })
  @ApiCreatedResponse({ description: 'Facture créée', type: InvoiceResponseDto })
  create(@Body() dto: CreateInvoiceDto) {
    return this.invoicesService.create(dto);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Mettre à jour une facture' })
  @ApiOkResponse({ description: 'Facture mise à jour', type: InvoiceResponseDto })
  update(@Param('id') id: string, @Body() dto: UpdateInvoiceDto) {
    return this.invoicesService.update(id, dto);
  }

  @Patch(':id/mark-paid')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Marquer une facture comme payée' })
  @ApiOkResponse({
    description: 'Facture marquée payée',
    type: InvoiceResponseDto,
  })
  markPaid(@Param('id') id: string) {
    return this.invoicesService.markPaid(id);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Supprimer une facture' })
  @ApiOkResponse({ description: 'Facture supprimée' })
  remove(@Param('id') id: string) {
    return this.invoicesService.remove(id);
  }
}
