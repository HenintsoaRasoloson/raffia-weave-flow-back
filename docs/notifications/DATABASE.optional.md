/**

- OPTIONAL: Notification Persistence in Database
- ===============================================
-
- Par défaut, les notifications sont IN-MEMORY ONLY (fire-and-forget).
-
- Si vous avez besoin de l'historique des notifications:
-
- 1.  Ajouter ce modèle à prisma/schema.prisma:
-
- model Notification {
- id String @id @default(cuid())
- userId String? // null = global
- role String? // null = global/personal
- type String // 'sales_order_created', etc.
- title String
- message String
- data Json?
- actionUrl String?
- priority String @default("normal")
- read Boolean @default(false)
- readAt DateTime?
- createdAt DateTime @default(now())
-
- user User? @relation(fields: [userId], references: [id], onDelete: Cascade)
-
- @@index([userId, createdAt])
- @@index([role])
- }
-
- 2.  Ajouter à User model:
-
- model User {
- // ... existing fields ...
- notifications Notification[]
- }
-
- 3.  Créer une migration:
-
- npx prisma migrate dev --name add_notifications_table
-
- 4.  Optionnel: Ajouter des méthodes au NotificationsService:
-
- async saveNotification(userId: string, payload: NotificationPayload) {
- return this.prisma.notification.create({
-     data: {
-       userId,
-       type: payload.type,
-       title: payload.title,
-       message: payload.message,
-       data: payload.data,
-       actionUrl: payload.actionUrl,
-       priority: payload.priority || 'normal',
-     },
- });
- }
-
- async markAsRead(notificationId: string) {
- return this.prisma.notification.update({
-     where: { id: notificationId },
-     data: { read: true, readAt: new Date() },
- });
- }
-
- async getUserNotifications(userId: string, limit = 50) {
- return this.prisma.notification.findMany({
-     where: { userId },
-     orderBy: { createdAt: 'desc' },
-     take: limit,
- });
- }
-
- 5.  Ajouter un endpoint REST:
-
- @Controller('notifications')
- @UseGuards(JwtAuthGuard)
- export class NotificationsController {
- @Get()
- async getMyNotifications(@CurrentUser() user: JwtAccessPayload) {
-     return this.notificationsService.getUserNotifications(user.sub);
- }
-
- @Patch(':id/read')
- async markAsRead(@Param('id') id: string) {
-     return this.notificationsService.markAsRead(id);
- }
- }
-
- 6.  Optionnel: Cleanup automatique (garder les 30 derniers jours):
-
- @Cron(CronExpression.EVERY_DAY_AT_2AM)
- async cleanupOldNotifications() {
- const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
- await this.prisma.notification.deleteMany({
-     where: { createdAt: { lt: thirtyDaysAgo } },
- });
- }
  */

// CURRENT STATE (fire-and-forget, zéro BD):
// - Notifications = in-memory only
// - Socket.IO distribue directement
// - Parfait pour real-time
// - Pas d'historique (par design)
// - Idéal pour performances

// RECOMMENDED APPROACH:
// - Keep real-time notifications IN-MEMORY (ce qu'on a)
// - Optional: Sauvegarder en BD seulement les IMPORTANTES
// - Utiliser des Rules: if (priority === 'high') saveToDb()

export {};
