/**
 * WebSocket Notifications Client Example
 * ======================================
 * 
 * Usage côté frontend (React, Vue, etc.)
 */

// ============================================
// 1. VANILLA JAVASCRIPT / NODE.JS
// ============================================

import { io } from 'socket.io-client';

class NotificationsClient {
  constructor(serverUrl = 'http://localhost:3000', token) {
    this.token = token;
    this.serverUrl = serverUrl;
    this.socket = null;
    this.handlers = {
      global: [],
      role: [],
      user: [],
    };
  }

  /**
   * Connecter et authentifier
   */
  connect() {
    this.socket = io(`${this.serverUrl}/notifications`);

    this.socket.on('connect', () => {
      console.log('✓ Connected to notifications');
      this.authenticate();
    });

    this.socket.on('authenticated', (data) => {
      if (data.success) {
        console.log('✓ Authenticated:', data);
        this.setupListeners();
      } else {
        console.error('✗ Auth failed:', data.error);
        this.socket.disconnect();
      }
    });

    this.socket.on('disconnect', () => {
      console.log('✗ Disconnected from notifications');
    });

    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  }

  /**
   * Envoyer le JWT pour l'authentification
   */
  authenticate() {
    this.socket.emit('authenticate', { token: this.token });
  }

  /**
   * Configurer les listeners pour les notifications
   */
  setupListeners() {
    // Notifications globales
    this.socket.on('notification:global', (notif) => {
      console.log('📢 Global notification:', notif);
      this.handlers.global.forEach((handler) => handler(notif));
    });

    // Notifications par rôle
    this.socket.on('notification:role', (notif) => {
      console.log('👥 Role notification:', notif);
      this.handlers.role.forEach((handler) => handler(notif));
    });

    // Notifications utilisateur
    this.socket.on('notification:user', (notif) => {
      console.log('👤 Personal notification:', notif);
      this.handlers.user.forEach((handler) => handler(notif));
    });
  }

  /**
   * Enregistrer un handler pour les notifications globales
   */
  onGlobalNotification(handler) {
    this.handlers.global.push(handler);
  }

  /**
   * Enregistrer un handler pour les notifications de rôle
   */
  onRoleNotification(handler) {
    this.handlers.role.push(handler);
  }

  /**
   * Enregistrer un handler pour les notifications personnelles
   */
  onUserNotification(handler) {
    this.handlers.user.push(handler);
  }

  /**
   * Déconnecter
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}

// ============================================
// 2. REACT EXAMPLE
// ============================================

import React, { useEffect, useState } from 'react';

function NotificationsDemo({ jwtToken }) {
  const [notifications, setNotifications] = useState([]);
  const [client, setClient] = useState(null);

  useEffect(() => {
    // Initialiser le client WS
    const notifClient = new NotificationsClient(
      'http://localhost:3000',
      jwtToken,
    );

    // Handler pour afficher les notifications
    const handleNotification = (notif) => {
      setNotifications((prev) => [
        ...prev,
        { ...notif, id: Date.now() },
      ]);

      // Toast de notification
      if (Notification.permission === 'granted') {
        new Notification(notif.title, {
          body: notif.message,
          tag: notif.type,
        });
      }
    };

    // Enregistrer les handlers
    notifClient.onGlobalNotification(handleNotification);
    notifClient.onRoleNotification(handleNotification);
    notifClient.onUserNotification(handleNotification);

    // Connecter
    notifClient.connect();
    setClient(notifClient);

    // Cleanup
    return () => {
      if (notifClient) {
        notifClient.disconnect();
      }
    };
  }, [jwtToken]);

  return (
    <div className="notifications-container">
      <h2>Notifications</h2>
      <ul>
        {notifications.map((notif) => (
          <li key={notif.id} className={`notif-${notif.priority || 'normal'}`}>
            <strong>{notif.title}</strong>
            <p>{notif.message}</p>
            {notif.actionUrl && (
              <a href={notif.actionUrl}>Voir</a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ============================================
// 3. VUE 3 EXAMPLE (COMPOSABLE)
// ============================================

import { ref, onMounted, onUnmounted } from 'vue';

export function useNotifications(jwtToken) {
  const notifications = ref([]);
  let client = null;

  const addNotification = (notif) => {
    notifications.value.push({
      ...notif,
      id: Date.now(),
    });

    // Auto-remove après 10 secondes
    setTimeout(() => {
      notifications.value = notifications.value.filter(
        (n) => n.id !== notif.id,
      );
    }, 10000);
  };

  onMounted(() => {
    client = new NotificationsClient('http://localhost:3000', jwtToken);
    client.onGlobalNotification(addNotification);
    client.onRoleNotification(addNotification);
    client.onUserNotification(addNotification);
    client.connect();
  });

  onUnmounted(() => {
    if (client) {
      client.disconnect();
    }
  });

  return {
    notifications,
  };
}

// Usage in component:
// const { notifications } = useNotifications(jwtToken);

// ============================================
// 4. STYLING EXAMPLE
// ============================================

const styles = `
  .notifications-container {
    position: fixed;
    top: 20px;
    right: 20px;
    width: 400px;
    max-height: 600px;
    overflow-y: auto;
    z-index: 1000;
  }

  .notifications-container li {
    list-style: none;
    background: white;
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 12px;
    border-left: 4px solid #3b82f6;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    animation: slideIn 0.3s ease-out;
  }

  .notifications-container li.notif-high {
    border-left-color: #ef4444;
    background: #fef2f2;
  }

  .notifications-container li.notif-low {
    border-left-color: #8b5cf6;
  }

  .notifications-container li strong {
    display: block;
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 4px;
    color: #1f2937;
  }

  .notifications-container li p {
    font-size: 13px;
    color: #4b5563;
    margin: 4px 0 8px;
  }

  .notifications-container li a {
    font-size: 12px;
    color: #3b82f6;
    text-decoration: none;
    font-weight: 500;
  }

  .notifications-container li a:hover {
    text-decoration: underline;
  }

  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
`;

export { NotificationsClient };
