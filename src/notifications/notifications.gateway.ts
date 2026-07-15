import { OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

/**
 * WebSocket Gateway pour notifications temps réel
 * - Notifications globales à tous les clients connectés
 * - Notifications ciblées par rôle
 * - Notifications individuelles
 * 
 * Clients rejoignent automatiquement une room selon leur rôle
 * ex: room 'role:GERANT', 'role:RESPONSABLE_PRODUCTION', etc.
 */
@WebSocketGateway({
  namespace: 'notifications',
  cors: { origin: '*' },
  transports: ['websocket', 'polling'],
})
@Injectable()
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(NotificationsGateway.name);

  @WebSocketServer() server: Server;

  constructor(private readonly notificationsService: NotificationsService) {}

  handleConnection(_client: Socket) {
    // Handshake brut (souvent un reconnect front) — pas de log ici
  }

  handleDisconnect(client: Socket) {
    this.notificationsService.unregisterClient(client.id);
  }

  /**
   * Client envoie son JWT pour authentification
   * Réponse: rejoint la room de son rôle (ex: 'role:GERANT')
   */
  @SubscribeMessage('authenticate')
  handleAuthenticate(
    client: Socket,
    payload: { token: string },
  ) {
    try {
      const user = this.notificationsService.verifyToken(payload?.token);
      const roleRoom = `role:${user.role}`;

      client.join(roleRoom);
      client.data.userId = user.sub;
      client.data.role = user.role;
      client.data.email = user.email;

      this.notificationsService.registerClient(client.id, user.sub, user.role);

      client.emit('authenticated', {
        success: true,
        userId: user.sub,
        role: user.role,
        joinedRoom: roleRoom,
      });

      this.logger.log(`Authenticated ${user.email} (${user.role}) on ${client.id}`);
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Invalid token';
      // Pas de disconnect : évite une boucle reconnect front + même token invalide
      this.logger.warn(`WS auth failed for ${client.id}: ${reason}`);
      client.emit('authenticated', { success: false, error: reason });
    }
  }

  /**
   * Envoyer une notification globale à tous les clients
   * (utilisé par les services internes)
   */
  sendGlobalNotification(notification: any) {
    this.server.emit('notification:global', {
      timestamp: new Date().toISOString(),
      ...notification,
    });
  }

  /**
   * Envoyer une notification à un rôle spécifique
   * ex: sendRoleNotification('RESPONSABLE_PRODUCTION', {...})
   */
  sendRoleNotification(role: string, notification: any) {
    this.server.to(`role:${role}`).emit('notification:role', {
      timestamp: new Date().toISOString(),
      targetRole: role,
      ...notification,
    });
  }

  /**
   * Envoyer une notification à un utilisateur spécifique
   */
  sendUserNotification(userId: string, notification: any) {
    // Trouver le socket connecté de cet utilisateur
    for (const [, socket] of this.server.of('/notifications').sockets) {
      if (socket.data.userId === userId) {
        socket.emit('notification:user', {
          timestamp: new Date().toISOString(),
          targetUserId: userId,
          ...notification,
        });
        break;
      }
    }
  }

  /**
   * Envoyer une notification à plusieurs rôles
   */
  sendMultiRoleNotification(roles: string[], notification: any) {
    roles.forEach(role => {
      this.sendRoleNotification(role, notification);
    });
  }
}
