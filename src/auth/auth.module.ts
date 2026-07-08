import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AdminGuard } from './guards/admin.guard';
import { JwtStrategy } from './strategies/jwt.strategy';

@Global()
@Module({
  imports: [PassportModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, AdminGuard],
  exports: [AuthService, AdminGuard],
})
export class AuthModule {}