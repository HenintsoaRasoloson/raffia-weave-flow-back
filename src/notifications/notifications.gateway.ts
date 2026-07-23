import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { corsOriginDelegate } from '../common/cors.util';
import { NotificationsService } from './notifications.service';

/**
 * WebSocket Gateway pour notifications temps réel
 * - Auth JWT obligatoire au handshake (auth.token ou Authorization)
 * - CORS aligné sur CORS_ORIGINS
 * - Rooms par rôle après authentification
 */
@WebSocketGateway({
  namespace: 'notifications',
  cors: {
    origin: corsOriginDelegate,
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
@Injectable()
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(NotificationsGateway.name);

  @WebSocketServer() server: Server;

  constructor(private readonly notificationsService: NotificationsService) {}

  handleConnection(client: Socket) {
    const token = this.extractHandshakeToken(client);

    try {
      this.authenticateClient(client, token);
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Invalid token';
      this.logger.warn(`WS handshake auth failed for ${client.id}: ${reason}`);
      client.emit('authenticated', { success: false, error: reason });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.notificationsService.unregisterClient(client.id);
  }

  /**
   * Ré-authentification / refresh token sans reconnect complet.
   */
  @SubscribeMessage('authenticate')
  handleAuthenticate(client: Socket, payload: { token: string }) {
    try {
      this.authenticateClient(client, payload?.token);
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Invalid token';
      this.logger.warn(`WS auth failed for ${client.id}: ${reason}`);
      client.emit('authenticated', { success: false, error: reason });
      client.disconnect(true);
    }
  }

  sendGlobalNotification(notification: Record<string, unknown>) {
    this.server.emit('notification:global', {
      timestamp: new Date().toISOString(),
      ...notification,
    });
  }

  sendRoleNotification(role: string, notification: Record<string, unknown>) {
    this.server.to(`role:${role}`).emit('notification:role', {
      timestamp: new Date().toISOString(),
      targetRole: role,
      ...notification,
    });
  }

  sendUserNotification(userId: string, notification: Record<string, unknown>) {
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

  sendMultiRoleNotification(
    roles: string[],
    notification: Record<string, unknown>,
  ) {
    roles.forEach((role) => {
      this.sendRoleNotification(role, notification);
    });
  }

  private extractHandshakeToken(client: Socket): string | undefined {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.trim()) {
      return authToken;
    }

    const header = client.handshake.headers.authorization;
    if (typeof header === 'string' && header.trim()) {
      return header;
    }

    return undefined;
  }

  private authenticateClient(client: Socket, token: string | undefined) {
    const user = this.notificationsService.verifyToken(token ?? '');
    const roleRoom = `role:${user.role}`;

    void client.join(roleRoom);
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

    this.logger.log(
      `Authenticated ${user.email} (${user.role}) on ${client.id}`,
    );
  }
}
