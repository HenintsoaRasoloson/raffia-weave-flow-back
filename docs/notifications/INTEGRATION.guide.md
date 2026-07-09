/**
 * Quick Integration Checklist for Notifications
 * ==============================================
 * 
 * Pour ajouter les notifications à un service existant:
 */

// ============================================
// ÉTAPE 1: Ajouter NotificationsModule aux imports
// ============================================

// En: src/invoices/invoices.module.ts

import { Module } from '@nestjs/common';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [InvoicesController],
  providers: [InvoicesService],
})
export class InvoicesModule {}

// ============================================
// ÉTAPE 2: Injecter NotificationsService
// ============================================

// En: src/invoices/invoices.service.ts

import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ...rest of the code
}

// ============================================
// ÉTAPE 3: Appeler notifyRole() ou notifyRoles()
// ============================================

// Exemple 1: Notification lors d'un paiement important

async recordPayment(id: string, dto: RecordPaymentDto, userId?: string) {
  const invoice = await this.prisma.invoice.findUnique({
    where: { id },
    include: { salesOrder: { include: { client: true } } },
  });

  // Enregistrer le paiement...
  const updated = await this.prisma.invoice.update({
    where: { id },
    data: { paidAmount: invoice.paidAmount + dto.amount },
  });

  // NOTIFIER si c'est un gros paiement
  if (dto.amount > 5000) {
    await this.notificationsService.notifyRole('GERANT', {
      type: 'large_payment',
      title: '💰 Paiement important',
      message: `${dto.amount.toFixed(2)} EUR - Facture ${invoice.invoiceNumber}`,
      data: {
        invoiceId: id,
        amount: dto.amount,
        clientName: invoice.salesOrder?.client?.name,
      },
      actionUrl: `/invoices/${id}`,
      priority: 'high',
    });
  }

  // TOUJOURS notifier le responsable financier
  await this.notificationsService.notifyRole(
    'RESPONSABLE_FINANCIER_STOCKS',
    {
      type: 'payment_recorded',
      title: '📝 Paiement enregistré',
      message: `${dto.amount.toFixed(2)} EUR - ${invoice.invoiceNumber}`,
      data: { invoiceId: id, amount: dto.amount },
      actionUrl: `/invoices/${id}`,
    },
  );

  return updated;
}

// ============================================
// EXEMPLE 2: Notifications en Production
// ============================================

// En: src/production-orders/production-orders.service.ts

async approveQuality(id: string, userId?: string) {
  const order = await this.prisma.productionOrder.findUnique({
    where: { id },
    include: { salesOrder: { include: { client: true } } },
  });

  const updated = await this.prisma.productionOrder.update({
    where: { id },
    data: { qualityApproved: true },
  });

  // Notifier que le produit est prêt
  await this.notificationsService.notifyRole(
    'RESPONSABLE_LIVRAISON',
    {
      type: 'production_ready',
      title: '✅ Produit prêt à la livraison',
      message: `OF ${order.orderNumber} - ${order.salesOrder?.client?.name}`,
      data: {
        productionOrderId: id,
        salesOrderId: order.salesOrderId,
      },
      actionUrl: `/production-orders/${id}`,
      priority: 'normal',
    },
  );

  // Notifier aussi le gérant
  await this.notificationsService.notifyRole('GERANT', {
    type: 'production_complete',
    title: '🎉 Production terminée',
    message: `OF ${order.orderNumber}`,
    data: { productionOrderId: id },
    actionUrl: `/production-orders/${id}`,
  });

  return updated;
}

// ============================================
// EXEMPLE 3: Notifications Multi-Rôles
// ============================================

// En: src/deliveries/deliveries.service.ts

async markDelivered(id: string, userId?: string) {
  const delivery = await this.prisma.delivery.findUnique({
    where: { id },
    include: {
      productionOrder: { include: { salesOrder: { include: { client: true } } } },
    },
  });

  const updated = await this.prisma.delivery.update({
    where: { id },
    data: { status: 'DELIVERED', deliveredAt: new Date() },
  });

  // Notifier PLUSIEURS rôles en une seule appel
  await this.notificationsService.notifyRoles(
    ['GERANT', 'RESPONSABLE_GENERAL', 'RESPONSABLE_LIVRAISON'],
    {
      type: 'delivery_completed',
      title: '🚚 Livraison effectuée',
      message: `Client: ${delivery.productionOrder?.salesOrder?.client?.name}`,
      data: {
        deliveryId: id,
        clientId: delivery.productionOrder?.salesOrder?.clientId,
      },
      actionUrl: `/deliveries/${id}`,
    },
  );

  return updated;
}

// ============================================
// BONNES PRATIQUES
// ============================================

/**
 * 1. NE PAS ATTENDRE les notifications
 *    ✗ BAD:   const notif = await this.notificationsService.notifyRole(...);
 *    ✓ GOOD:  this.notificationsService.notifyRole(...); // fire-and-forget
 *
 * 2. Utiliser des types clairs et constants
 *    'sales_order_created', 'payment_recorded', 'production_ready', etc.
 *
 * 3. Inclure toujours actionUrl pour que l'utilisateur puisse cliquer
 *
 * 4. Utiliser les priorités intelligemment
 *    - high: alertes importantes, erreurs, montants > seuil
 *    - normal: notifications standard
 *    - low: infos non urgentes
 *
 * 5. Ajouter les données pertinentes dans 'data' pour le UI
 *
 * 6. Notifier les rôles APPROPRIÉS seulement
 *    - Paiement → RESPONSABLE_FINANCIER_STOCKS + GERANT (si important)
 *    - Production → RESPONSABLE_PRODUCTION + GERANT
 *    - Livraison → RESPONSABLE_LIVRAISON + GERANT
 *
 * 7. Garder les messages COURTS (< 100 caractères idéalement)
 */

export {};
