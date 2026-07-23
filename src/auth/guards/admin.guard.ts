import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { UserRole } from '../../generated/prisma/client';
import { JwtAccessPayload } from '../auth.types';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtAccessPayload | undefined;

    if (!user?.sub) {
      throw new ForbiddenException('Admin access required.');
    }

    if (user.isAdmin || user.role === UserRole.GERANT) {
      return true;
    }

    throw new ForbiddenException('Admin access required.');
  }
}
