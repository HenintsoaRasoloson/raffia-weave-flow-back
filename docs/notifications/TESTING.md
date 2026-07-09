/**

- 🧪 TEST: Système de Notifications WebSocket
- ===========================================
-
- Tester manuellement avec cURL, Postman ou Node.js
  */

// ============================================
// 1. TEST AVEC NODEJS
// ============================================

// npm install socket.io-client
// node test-notifications.js

const io = require('socket.io-client');

const socket = io('http://localhost:3000/notifications', {
reconnection: true,
reconnectionDelay: 1000,
reconnectionDelayMax: 5000,
reconnectionAttempts: 5,
});

// Mock JWT (dans un vrai test, générer via /auth/login)
const MOCK_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTEyMyIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsIm5hbWUiOiJUZXN0IFVzZXIiLCJyb2xlIjoiR0VyYU5UIiwiaWF0IjoxNjI1MDAwMDAwfQ.signature';

socket.on('connect', () => {
console.log('✓ Connecté au serveur WebSocket');

// S'authentifier
socket.emit('authenticate', { token: MOCK_JWT });
});

socket.on('authenticated', (data) => {
console.log('✓ Authentification:', data);
});

socket.on('notification:global', (notif) => {
console.log('\n📢 [GLOBAL]:', notif);
});

socket.on('notification:role', (notif) => {
console.log('\n👥 [ROLE]:', notif);
});

socket.on('notification:user', (notif) => {
console.log('\n👤 [USER]:', notif);
});

socket.on('disconnect', () => {
console.log('✗ Déconnecté');
});

socket.on('error', (error) => {
console.error('❌ Erreur:', error);
});

// Garder la connexion ouverte
process.on('SIGINT', () => {
socket.disconnect();
process.exit();
});

// ============================================
// 2. TEST API AVEC POSTMAN/CURL
// ============================================

/**

- 1.  D'abord, créer une commande client:
-
- POST http://localhost:3000/sales-orders
- Header: Authorization: Bearer <JWT_TOKEN>
- Body: {
- "orderNumber": "CMD-001",
- "clientId": "<client-id>",
- "orderDate": "2026-07-09",
- "items": [
-     {
-       "description": "Panier raphia",
-       "quantity": 10,
-       "unitPriceHt": 50
-     }
- ]
- }
-
- → NotificationsService.notifyRoles(['GERANT', 'RESPONSABLE_GENERAL'])
- → WebSocket: notification:role reçoit l'événement
  */

/**

- 2. Enregistrer un paiement:
-
- POST http://localhost:3000/invoices/:id/record-payment
- Header: Authorization: Bearer <JWT_TOKEN>
- Body: {
- "amount": 6000,
- "paymentMethod": "BANK_TRANSFER",
- "paidAt": "2026-07-09T10:00:00Z"
- }
-
- → Amount > 5000 → NotificationsService.notifyRole('GERANT')
- → RESPONSABLE_FINANCIER_STOCKS toujours notifié
- → Si facture intégralement payée → notifyRoles(['GERANT', 'RESPONSABLE_GENERAL'])
  */

/**

- 3. Approuver qualité production:
-
- PATCH http://localhost:3000/production-orders/:id/approve-quality
- Header: Authorization: Bearer <JWT_TOKEN>
-
- → NotificationsService.notifyRole('RESPONSABLE_LIVRAISON')
- → NotificationsService.notifyRole('GERANT')
  */

/**

- 4. Marquer livraison comme effectuée:
-
- PATCH http://localhost:3000/deliveries/:id/mark-delivered
- Header: Authorization: Bearer <JWT_TOKEN>
-
- → NotificationsService.notifyRoles(['GERANT', 'RESPONSABLE_GENERAL', 'RESPONSABLE_LIVRAISON'])
  */

// ============================================
// 3. CHECKLIST DE TEST
// ============================================

/**

- ✓ Test 1: Connexion WebSocket
- [ ] Client se connecte à /notifications
- [ ] Client envoie JWT via authenticate event
- [ ] Gateway répond avec authenticated { success: true }
- [ ] Client rejoint room role:GERANT (ou autre)
-
- ✓ Test 2: Notification création commande
- [ ] POST /sales-orders avec JWT
- [ ] WebSocket reçoit notification:role
- [ ] Message contient orderNumber, clientName, totalTtc
- [ ] Seuls GERANT et RESPONSABLE_GENERAL reçoivent
-
- ✓ Test 3: Notification paiement important
- [ ] POST /invoices/:id/record-payment avec amount > 5000
- [ ] GERANT reçoit notification:role (priority: high)
- [ ] RESPONSABLE_FINANCIER_STOCKS reçoit aussi
- [ ] Message contient montant, numéro facture, client
-
- ✓ Test 4: Notification facture payée
- [ ] POST /invoices/:id/record-payment avec montant final
- [ ] GERANT et RESPONSABLE_GENERAL reçoivent
- [ ] Message: "Facture intégralement payée"
-
- ✓ Test 5: Notification production prête
- [ ] PATCH /production-orders/:id/approve-quality
- [ ] RESPONSABLE_LIVRAISON reçoit avec priority:normal
- [ ] GERANT reçoit aussi
- [ ] actionUrl pointe vers /production-orders/:id
-
- ✓ Test 6: Notification livraison effectuée
- [ ] PATCH /deliveries/:id/mark-delivered
- [ ] 3 rôles reçoivent: GERANT, RESPONSABLE_GENERAL, RESPONSABLE_LIVRAISON
- [ ] Message contient client name et delivery number
-
- ✓ Test 7: Déconnexion
- [ ] Client disconnect()
- [ ] Socket quitte les rooms
- [ ] Reconnexion possible
-
- ✓ Test 8: Erreur token
- [ ] authenticate avec JWT invalide
- [ ] Gateway répond authenticated { success: false }
- [ ] Socket se déconnecte
      */

// ============================================
// 4. LOGS À OBSERVER
// ============================================

/**

- Dans la console NestJS:
-
- [ ] Client connected: <socket-id>
- [ ] User <email> (<role>) authenticated on socket <socket-id>
- [ ] ENSUITE: Les notifications sont SILENCIEUSES (par design)
-     → Pas de logs = firewall fonctionne bien
-     → Les clients reçoivent juste les événements WebSocket
- [ ] Client disconnected: <socket-id>
-
- Vérifier AUSSI:
- [ ] Audit logs créés (AuditLog en BD)
- [ ] Pas d'erreurs dans les notifications (catch error)
      */

// ============================================
// 5. DEBUGGING AVANCÉ
// ============================================

/**

- Ajouter dans notifications.service.ts pour debug:
-
- async notifyRole(role: string, payload: NotificationPayload) {
- console.log(`📤 Sending to ${role}:`, payload.type);
- if (!this.gateway) {
-     console.warn('❌ Gateway not initialized');
-     return;
- }
- this.gateway.sendRoleNotification(role, payload);
- console.log(`✓ Sent to role ${role}`);
- }
-
- Dans notifications.gateway.ts:
-
- handleAuthenticate(client: Socket, payload: { token: string }) {
- try {
-     const user = this.notificationsService.verifyToken(payload.token);
-     const roleRoom = `role:${user.role}`;
-
-     client.join(roleRoom);
-     console.log(`✓ User ${user.email} joined room ${roleRoom}`);
-     console.log(`  Room members count:`, this.server.to(roleRoom).sockets.size);
- } catch (error) {
-     console.error('❌ Auth error:', error.message);
- }
- }
  */

// ============================================
// 6. PERFORMANCE MONITORING
// ============================================

/**

- Métriques à surveiller:
-
- - Latence notification: < 50ms
- - Mémoire par client: ~20KB
- - CPU au repos: < 1%
- - Messages/sec pouvant être traités: > 1000
-
- Tools:
- - Chrome DevTools Network tab (WebSocket)
- - Node.js Profiler (--prof)
- - Autocannon pour load testing:
- npx autocannon -c 100 http://localhost:3000/
  */

module.exports = {
MOCK_JWT,
testScript: true,
};
