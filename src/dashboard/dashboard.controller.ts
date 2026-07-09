import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardDto } from './dto/dashboard.dto';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * GET /dashboard
   * Retourne toutes les données du tableau de bord pour l'accueil
   */
  @Get()
  async getDashboard(@Query('days') days: string = '30'): Promise<DashboardDto> {
    const daysNumber = Math.min(Math.max(parseInt(days) || 30, 1), 365);
    return this.dashboardService.getDashboard(daysNumber);
  }

  /**
   * GET /dashboard/kpis
   * KPIs: CA, commandes en cours, marge, trésorerie
   */
  @Get('kpis')
  async getKpis(@Query('days') days: string = '30') {
    const daysNumber = Math.min(Math.max(parseInt(days) || 30, 1), 365);
    return this.dashboardService.getKpis(daysNumber);
  }

  /**
   * GET /dashboard/revenue
   * Graphique: Chiffre d'affaires B2B vs B2C par mois
   */
  @Get('revenue')
  async getRevenueChart(@Query('months') months: string = '8') {
    const monthsNumber = Math.min(Math.max(parseInt(months) || 8, 1), 24);
    return this.dashboardService.getRevenueChart(monthsNumber);
  }

  /**
   * GET /dashboard/production-orders
   * Ordres de fabrication en cours
   */
  @Get('production-orders')
  async getProductionOrders() {
    return this.dashboardService.getProductionOrders();
  }

  /**
   * GET /dashboard/recent-orders
   * Dernières commandes (ventes)
   */
  @Get('recent-orders')
  async getRecentOrders(@Query('limit') limit: string = '10') {
    const limitNumber = Math.min(Math.max(parseInt(limit) || 10, 1), 100);
    return this.dashboardService.getRecentOrders(limitNumber);
  }

  /**
   * GET /dashboard/alerts
   * Alertes & suggestions (stock bas, production derrière planning, etc.)
   */
  @Get('alerts')
  async getAlerts() {
    return this.dashboardService.getAlerts();
  }

  /**
   * GET /dashboard/quick-stats
   * Statistiques rapides pour les 4 cartes d'accès rapide
   */
  @Get('quick-stats')
  async getQuickStats() {
    return this.dashboardService.getQuickStats();
  }
}
