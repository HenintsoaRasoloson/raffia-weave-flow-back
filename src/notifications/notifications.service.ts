import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { getAuthConfig } from '../auth/auth.config';
import { NotificationsGateway } from './notifications.gateway';
import type { NotificationType } from './notification.types';

export interface NotificationPayload {
  type: NotificationType | string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
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
  private readonly logger = new Logger(NotificationsService.name);
  private gateway: NotificationsGateway;
  /** socketId → userId (sessions WS authentifiées) */
  private readonly connectedClients = new Map<string, { userId: string; role: string }>();

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
      this.logger.warn('Gateway not initialized');
      return;
    }
    this.gateway.sendGlobalNotification(payload);
  }

  /**
   * Envoyer une notification à un rôle spécifique
   */
  async notifyRole(role: string, payload: NotificationPayload) {
    if (!this.gateway) {
      this.logger.warn('Gateway not initialized');
      return;
    }
    this.gateway.sendRoleNotification(role, payload);
  }

  /**
   * Envoyer une notification à plusieurs rôles
   */
  async notifyRoles(roles: string[], payload: NotificationPayload) {
    if (!this.gateway) {
      this.logger.warn('Gateway not initialized');
      return;
    }
    this.gateway.sendMultiRoleNotification(roles, payload);
  }

  /**
   * Envoyer une notification à un utilisateur spécifique
   */
  async notifyUser(userId: string, payload: NotificationPayload) {
    if (!this.gateway) {
      this.logger.warn('Gateway not initialized');
      return;
    }
    this.gateway.sendUserNotification(userId, payload);
  }

  /**
   * Vérifier et décoder un access JWT (même secret que AuthService)
   */
  verifyToken(token: string) {
    if (!token || typeof token !== 'string') {
      throw new Error('Missing token');
    }

    const raw = token.startsWith('Bearer ') ? token.slice(7) : token;
    const { accessTokenSecret } = getAuthConfig();

    try {
      const payload = this.jwtService.verify(raw, { secret: accessTokenSecret });
      return {
        sub: payload.sub,
        email: payload.email,
        name: payload.name,
        role: payload.role,
      };
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Invalid token';
      throw new Error(reason);
    }
  }

  /**
   * Enregistrer une session WS authentifiée
   */
  registerClient(socketId: string, userId: string, role: string) {
    this.connectedClients.set(socketId, { userId, role });
  }

  /**
   * Désenregistrer une session WS (disconnect)
   */
  unregisterClient(socketId: string) {
    this.connectedClients.delete(socketId);
  }
}
