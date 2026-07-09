jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { ComponentsService } from './components.service';

describe('ComponentsService', () => {
  it('returns paginated components', async () => {
    const tx = {
      component: {
        findMany: jest.fn().mockResolvedValue([{ id: 'cmp-1' }]),
        count: jest.fn().mockResolvedValue(1),
      },
    };
    const prisma = {
      $transaction: jest.fn(async (cb: any) => cb(tx)),
    } as any;

    const service = new ComponentsService(prisma);
    const result = await service.findAll({ page: 1, pageSize: 10, q: 'cotton' });

    expect(tx.component.findMany).toHaveBeenCalled();
    expect(result.total).toBe(1);
    expect(result.items).toEqual([{ id: 'cmp-1' }]);
  });
});
