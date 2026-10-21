import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../generated/prisma/client';
import { JwtAccessPayload } from '../auth.types';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtAccessPayload | undefined;

    if (!user?.sub) {
      throw new ForbiddenException('Connexion requise.');
    }

    if (user.isAdmin) {
      return true;
    }

    if (requiredRoles.includes(user.role as UserRole)) {
      return true;
    }

    throw new ForbiddenException(
      'Votre rôle ne permet pas cette action. Demandez au gérant.',
    );
  }
}
