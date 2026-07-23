import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  RolesAllowed,
  STOCK_FINANCE_ROLES,
} from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtAccessPayload } from '../auth/auth.types';
import { BudgetAlertQueryDto } from './dto/budget-alert-query.dto';
import { CreateFinancialBudgetDto } from './dto/create-financial-budget.dto';
import { CreateLedgerCategoryDto } from './dto/create-ledger-category.dto';
import { CreateLedgerEntryDto } from './dto/create-ledger-entry.dto';
import { FinancialOverviewQueryDto } from './dto/financial-overview-query.dto';
import { ListFinancialBudgetsQueryDto } from './dto/list-financial-budgets-query.dto';
import { ListLedgerEntriesQueryDto } from './dto/list-ledger-entries-query.dto';
import { OverdueReminderQueryDto } from './dto/overdue-reminder-query.dto';
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
  @RolesAllowed(...STOCK_FINANCE_ROLES)
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

  @Get('overdue-reminders')
  @ApiOperation({
    summary: 'Previsualiser les relances d impayes',
    description:
      'Retourne les factures en retard, leur anciennete et le message de relance suggere.',
  })
  @ApiOkResponse({ description: 'Relances d impayes suggerees' })
  previewOverdueReminders(@Query() query: OverdueReminderQueryDto) {
    return this.financialTrackingService.previewOverdueReminders(query);
  }

  @Post('overdue-reminders/notify')
  @RolesAllowed(...STOCK_FINANCE_ROLES)
  @ApiOperation({
    summary: 'Notifier les impayes au responsable financier',
    description:
      'Envoie des notifications internes pour les factures en retard detectees par les filtres fournis.',
  })
  @ApiOkResponse({ description: 'Notifications de relance envoyees' })
  notifyOverdueReminders(@Body() dto: OverdueReminderQueryDto) {
    return this.financialTrackingService.notifyOverdueReminders(dto);
  }

  @Get('budget-alerts')
  @ApiOperation({
    summary: 'Previsualiser les depassements budgetaires',
    description:
      'Retourne les budgets en depassement sur la periode analysee et leur ecart reel vs prevision.',
  })
  @ApiOkResponse({ description: 'Alertes budgetaires detectees' })
  previewBudgetAlerts(@Query() query: BudgetAlertQueryDto) {
    return this.financialTrackingService.previewBudgetAlerts(query);
  }

  @Post('budget-alerts/notify')
  @RolesAllowed(...STOCK_FINANCE_ROLES)
  @ApiOperation({
    summary: 'Notifier les depassements budgetaires',
    description:
      'Envoie des notifications internes sur les budgets de depense qui depassent les seuils fournis.',
  })
  @ApiOkResponse({ description: 'Notifications budgetaires envoyees' })
  notifyBudgetAlerts(@Body() dto: BudgetAlertQueryDto) {
    return this.financialTrackingService.notifyBudgetAlerts(dto);
  }

  @Post('budgets')
  @RolesAllowed(...STOCK_FINANCE_ROLES)
  @ApiOperation({ summary: 'Creer un budget de suivi financier' })
  @ApiCreatedResponse({ description: 'Budget financier cree' })
  createBudget(@Body() dto: CreateFinancialBudgetDto) {
    return this.financialTrackingService.createBudget(dto);
  }

  @Post('ledger-entries')
  @RolesAllowed(...STOCK_FINANCE_ROLES)
  @ApiOperation({
    summary: 'Creer une ecriture manuelle de suivi financier',
    description:
      'Permet de saisir depenses, charges, salaires, virements internes ou ajustements de tresorerie.',
  })
  @ApiCreatedResponse({ description: 'Ecriture de tresorerie creee' })
  createLedgerEntry(
    @Body() dto: CreateLedgerEntryDto,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    return this.financialTrackingService.createLedgerEntry(dto, user.sub);
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