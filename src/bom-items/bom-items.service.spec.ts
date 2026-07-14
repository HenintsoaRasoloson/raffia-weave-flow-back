import type { PrismaService } from '../prisma/prisma.service';
import { BomItemsService } from './bom-items.service';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

describe('BomItemsService', () => {
  it('creates a bom item', async () => {
    const prisma = {
      bomItem: {
        create: jest.fn().mockResolvedValue({ id: 'bom-1' }),
      },
    } as unknown as PrismaService;

    const service = new BomItemsService(prisma);
    const dto = {
      productId: 'prod-1',
      componentId: 'cmp-1',
      quantity: 3,
      unitCost: 2.5,
    };

    const result = await service.create(dto);

    expect(prisma.bomItem.create).toHaveBeenCalledWith({
      data: {
        productId: 'prod-1',
        variantId: undefined,
        componentId: 'cmp-1',
        colorId: undefined,
        quantity: 3,
        unitCost: 2.5,
      },
    });
    expect(result).toEqual({ id: 'bom-1' });
  });
});
