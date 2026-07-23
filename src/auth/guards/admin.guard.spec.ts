import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '../../generated/prisma/client';
import { AdminGuard } from './admin.guard';

describe('AdminGuard', () => {
  const guard = new AdminGuard();

  function contextWithUser(user: Record<string, unknown> | undefined) {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as never;
  }

  it('allows GERANT from JWT claims', () => {
    expect(
      guard.canActivate(
        contextWithUser({ sub: 'u1', role: UserRole.GERANT, isAdmin: false }),
      ),
    ).toBe(true);
  });

  it('allows isAdmin from JWT claims', () => {
    expect(
      guard.canActivate(
        contextWithUser({
          sub: 'u1',
          role: UserRole.RESPONSABLE_PRODUCTION,
          isAdmin: true,
        }),
      ),
    ).toBe(true);
  });

  it('rejects non-admin roles', () => {
    expect(() =>
      guard.canActivate(
        contextWithUser({
          sub: 'u1',
          role: UserRole.RESPONSABLE_PRODUCTION,
          isAdmin: false,
        }),
      ),
    ).toThrow(ForbiddenException);
  });
});
