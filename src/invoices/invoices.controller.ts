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
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { InvoicesService } from './invoices.service';

@ApiTags('Factures')
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  @ApiOperation({ summary: 'Lister les factures' })
  @ApiOkResponse({ description: 'Liste des factures' })
  findAll() {
    return this.invoicesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer une facture' })
  @ApiOkResponse({ description: 'Facture trouvée' })
  findOne(@Param('id') id: string) {
    return this.invoicesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Créer une facture' })
  @ApiCreatedResponse({ description: 'Facture créée' })
  create(@Body() dto: CreateInvoiceDto) {
    return this.invoicesService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Mettre à jour une facture' })
  @ApiOkResponse({ description: 'Facture mise à jour' })
  update(@Param('id') id: string, @Body() dto: UpdateInvoiceDto) {
    return this.invoicesService.update(id, dto);
  }

  @Patch(':id/mark-paid')
  @ApiOperation({ summary: 'Marquer une facture comme payée' })
  @ApiOkResponse({ description: 'Facture marquée payée' })
  markPaid(@Param('id') id: string) {
    return this.invoicesService.markPaid(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer une facture' })
  @ApiOkResponse({ description: 'Facture supprimée' })
  remove(@Param('id') id: string) {
    return this.invoicesService.remove(id);
  }
}
