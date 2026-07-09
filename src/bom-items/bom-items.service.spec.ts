jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { BomItemsService } from './bom-items.service';

describe('BomItemsService', () => {
  it('creates a bom item', async () => {
    const prisma = {
      bomItem: {
        create: jest.fn().mockResolvedValue({ id: 'bom-1' }),
      },
    } as any;

    const service = new BomItemsService(prisma);
    const dto = {
      productId: 'prod-1',
      componentId: 'cmp-1',
      quantity: 3,
      unitCost: 2.5,
    };

    const result = await service.create(dto as any);

    expect(prisma.bomItem.create).toHaveBeenCalledWith({ data: dto });
    expect(result).toEqual({ id: 'bom-1' });
  });
});
