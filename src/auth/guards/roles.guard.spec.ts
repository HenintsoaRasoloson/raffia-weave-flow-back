import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../generated/prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  const reflector = {
    getAllAndOverride: jest.fn(),
  } as unknown as Reflector;
  const guard = new RolesGuard(reflector);

  function contextWithUser(user: Record<string, unknown> | undefined) {
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as never;
  }

  it('allows when no roles metadata is set', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(undefined);
    expect(guard.canActivate(contextWithUser({ sub: 'u1' }))).toBe(true);
  });

  it('allows isAdmin regardless of role list', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue([
      UserRole.RESPONSABLE_PRODUCTION,
    ]);
    expect(
      guard.canActivate(
        contextWithUser({
          sub: 'u1',
          role: UserRole.RESPONSABLE_LIVRAISON,
          isAdmin: true,
        }),
      ),
    ).toBe(true);
  });

  it('allows matching role', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue([
      UserRole.RESPONSABLE_FINANCIER_STOCKS,
    ]);
    expect(
      guard.canActivate(
        contextWithUser({
          sub: 'u1',
          role: UserRole.RESPONSABLE_FINANCIER_STOCKS,
          isAdmin: false,
        }),
      ),
    ).toBe(true);
  });

  it('rejects mismatched role', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue([
      UserRole.RESPONSABLE_PRODUCTION,
    ]);
    expect(() =>
      guard.canActivate(
        contextWithUser({
          sub: 'u1',
          role: UserRole.RESPONSABLE_LIVRAISON,
          isAdmin: false,
        }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('reads ROLES_KEY metadata', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue([]);
    guard.canActivate(contextWithUser({ sub: 'u1', role: 'GERANT', isAdmin: false }));
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
      ROLES_KEY,
      expect.any(Array),
    );
  });
});
