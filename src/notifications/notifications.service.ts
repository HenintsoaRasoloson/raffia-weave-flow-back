import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { NotificationsGateway } from './notifications.gateway';

export interface NotificationPayload {
  type: string; // 'sale_order_created', 'invoice_payment', 'production_completed', etc.
  title: string;
  message: string;
  data?: Record<string, any>;
  actionUrl?: string;
  priority?: 'low' | 'normal' | 'high';
}

/**
 * Service centralisé pour envoyer des notifications
 * Utilisé par les autres services pour déclencher des notifications WS
 * 
 * Exemple d'utilisation dans SalesOrdersService:
 * ```
 * await this.notificationsService.notifyRoles(
 *   ['GERANT', 'RESPONSABLE_GENERAL'],
 *   { type: 'sales_order_created', title: 'Nouvelle commande', message: ... }
 * );
 * ```
 */
@Injectable()
export class NotificationsService {
  private gateway: NotificationsGateway;

  constructor(private readonly jwtService: JwtService) {}

  /**
   * Injecter la gateway (après qu'elle soit créée)
   */
  setGateway(gateway: NotificationsGateway) {
    this.gateway = gateway;
  }

  /**
   * Envoyer une notification globale à tous les clients
   */
  async notifyGlobal(payload: NotificationPayload) {
    if (!this.gateway) {
      console.warn('Gateway not initialized');
      return;
    }
    this.gateway.sendGlobalNotification(payload);
  }

  /**
   * Envoyer une notification à un rôle spécifique
   */
  async notifyRole(role: string, payload: NotificationPayload) {
    if (!this.gateway) {
      console.warn('Gateway not initialized');
      return;
    }
    this.gateway.sendRoleNotification(role, payload);
  }

  /**
   * Envoyer une notification à plusieurs rôles
   */
  async notifyRoles(roles: string[], payload: NotificationPayload) {
    if (!this.gateway) {
      console.warn('Gateway not initialized');
      return;
    }
    this.gateway.sendMultiRoleNotification(roles, payload);
  }

  /**
   * Envoyer une notification à un utilisateur spécifique
   */
  async notifyUser(userId: string, payload: NotificationPayload) {
    if (!this.gateway) {
      console.warn('Gateway not initialized');
      return;
    }
    this.gateway.sendUserNotification(userId, payload);
  }

  /**
   * Vérifier et décoder un JWT token
   * Utilisé par la gateway lors de l'authentification WS
   */
  verifyToken(token: string) {
    try {
      const payload = this.jwtService.verify(token);
      return {
        sub: payload.sub,
        email: payload.email,
        name: payload.name,
        role: payload.role,
      };
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  /**
   * Enregistrer/tracer un client (optionnel, pour analytics)
   */
  registerClient(socketId: string, userId: string, role: string) {
    // Peut être utilisé pour tracker les utilisateurs connectés
    console.log(`Registered: ${userId} (${role}) - Socket: ${socketId}`);
  }

  /**
   * Désenregistrer un client
   */
  unregisterClient(socketId: string) {
    console.log(`Unregistered socket: ${socketId}`);
  }
}
