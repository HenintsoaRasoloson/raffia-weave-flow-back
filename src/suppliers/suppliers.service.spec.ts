jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { SuppliersService } from './suppliers.service';

describe('SuppliersService', () => {
  it('creates a supplier', async () => {
    const prisma = {
      supplier: {
        create: jest.fn().mockResolvedValue({ id: 'sup-1', name: 'Fiber Co' }),
      },
    } as any;

    const service = new SuppliersService(prisma);
    const dto = { name: 'Fiber Co', email: 'contact@fiber.co' };

    const result = await service.create(dto as any);

    expect(prisma.supplier.create).toHaveBeenCalledWith({ data: dto });
    expect(result).toEqual({ id: 'sup-1', name: 'Fiber Co' });
  });
});
