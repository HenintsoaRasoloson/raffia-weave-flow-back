import { describe, expect, it, jest } from '@jest/globals';
import type { PrismaService } from '../prisma/prisma.service';
import { ComponentsService } from './components.service';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

describe('ComponentsService', () => {
  it('returns paginated components', async () => {
    const tx = {
      component: {
        findMany: jest
          .fn<() => Promise<Array<{ id: string }>>>()
          .mockResolvedValue([{ id: 'cmp-1' }]),
        count: jest.fn<() => Promise<number>>().mockResolvedValue(1),
      },
    };

    const prisma = {
      $transaction: jest.fn(<T>(cb: (trx: typeof tx) => T): T => cb(tx)),
    } as unknown as PrismaService;

    const service = new ComponentsService(prisma);
    const result = await service.findAll({
      page: 1,
      pageSize: 10,
      q: 'cotton',
    });

    expect(tx.component.findMany).toHaveBeenCalled();
    expect(result.total).toBe(1);
    expect(result.items).toEqual([{ id: 'cmp-1' }]);
  });
});
