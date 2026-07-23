import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';
import { UserRole } from '../../generated/prisma/client';
import { RolesGuard } from '../guards/roles.guard';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

/** JWT authentifié + rôle autorisé (isAdmin bypass). */
export function RolesAllowed(...roles: UserRole[]) {
  return applyDecorators(Roles(...roles), UseGuards(RolesGuard));
}

export const MANAGEMENT_ROLES: UserRole[] = [
  UserRole.GERANT,
  UserRole.RESPONSABLE_GENERAL,
];

export const PRODUCTION_ROLES: UserRole[] = [
  ...MANAGEMENT_ROLES,
  UserRole.RESPONSABLE_PRODUCTION,
];

export const STOCK_FINANCE_ROLES: UserRole[] = [
  ...MANAGEMENT_ROLES,
  UserRole.RESPONSABLE_FINANCIER_STOCKS,
];

export const DELIVERY_ROLES: UserRole[] = [
  ...MANAGEMENT_ROLES,
  UserRole.RESPONSABLE_LIVRAISON,
];
