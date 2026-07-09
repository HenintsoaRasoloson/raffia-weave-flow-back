import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { AdminGuard } from '../auth/guards/admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateFinancialBudgetDto } from './dto/create-financial-budget.dto';
import { CreateLedgerCategoryDto } from './dto/create-ledger-category.dto';
import { CreateLedgerEntryDto } from './dto/create-ledger-entry.dto';
import { FinancialOverviewQueryDto } from './dto/financial-overview-query.dto';
import { ListFinancialBudgetsQueryDto } from './dto/list-financial-budgets-query.dto';
import { ListLedgerEntriesQueryDto } from './dto/list-ledger-entries-query.dto';
import { FinancialTrackingService } from './financial-tracking.service';

@ApiTags('Suivi financier')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('financial-tracking')
export class FinancialTrackingController {
  constructor(
    private readonly financialTrackingService: FinancialTrackingService,
  ) {}

  @Get('overview')
  @ApiOperation({
    summary: 'Vue d ensemble du suivi financier',
    description:
      'Expose tresorerie suivie, encaissements, impayes, engagements fournisseurs, couts et marge estimee.',
  })
  @ApiOkResponse({ description: 'Synthese financiere calculee' })
  getOverview(@Query() query: FinancialOverviewQueryDto) {
    return this.financialTrackingService.getOverview(query);
  }

  @Get('ledger-entries')
  @ApiOperation({ summary: 'Lister le journal de tresorerie' })
  @ApiOkResponse({ description: 'Ecritures de tresorerie paginees' })
  listLedgerEntries(@Query() query: ListLedgerEntriesQueryDto) {
    return this.financialTrackingService.listLedgerEntries(query);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Lister les categories structurees de suivi financier' })
  @ApiOkResponse({ description: 'Categories financieres actives et systeme' })
  listLedgerCategories() {
    return this.financialTrackingService.listLedgerCategories();
  }

  @Post('categories')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Creer une categorie de suivi financier' })
  @ApiCreatedResponse({ description: 'Categorie financiere creee' })
  createLedgerCategory(@Body() dto: CreateLedgerCategoryDto) {
    return this.financialTrackingService.createLedgerCategory(dto);
  }

  @Get('budgets')
  @ApiOperation({ summary: 'Lister les budgets et l ecart reel vs prevision' })
  @ApiOkResponse({ description: 'Budgets financiers consolides' })
  listBudgets(@Query() query: ListFinancialBudgetsQueryDto) {
    return this.financialTrackingService.listBudgets(query);
  }

  @Post('budgets')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Creer un budget de suivi financier' })
  @ApiCreatedResponse({ description: 'Budget financier cree' })
  createBudget(@Body() dto: CreateFinancialBudgetDto) {
    return this.financialTrackingService.createBudget(dto);
  }

  @Post('ledger-entries')
  @UseGuards(AdminGuard)
  @ApiOperation({
    summary: 'Creer une ecriture manuelle de suivi financier',
    description:
      'Permet de saisir depenses, charges, salaires, virements internes ou ajustements de tresorerie.',
  })
  @ApiCreatedResponse({ description: 'Ecriture de tresorerie creee' })
  createLedgerEntry(@Body() dto: CreateLedgerEntryDto) {
    return this.financialTrackingService.createLedgerEntry(dto);
  }

  @Get('clients/:clientId')
  @ApiOperation({
    summary: 'Synthese financiere d un client',
    description:
      'Consolide facturation, encaissements, impayes, marge estimee et dernieres ecritures liees au client.',
  })
  @ApiParam({ name: 'clientId', description: 'ID du client' })
  @ApiOkResponse({ description: 'Fiche financiere client' })
  getClientSummary(
    @Param('clientId') clientId: string,
    @Query() query: FinancialOverviewQueryDto,
  ) {
    return this.financialTrackingService.getClientSummary(clientId, query);
  }
}