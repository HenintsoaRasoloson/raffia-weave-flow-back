import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { getAuthConfig } from '../auth/auth.config';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [
    // Same access secret as HTTP JWT auth (was JWT_SECRET / your-secret-key)
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: getAuthConfig().accessTokenSecret,
      }),
    }),
  ],
  providers: [NotificationsService, NotificationsGateway],
  exports: [NotificationsService],
})
export class NotificationsModule {}
