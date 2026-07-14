import type { PrismaService } from '../prisma/prisma.service';
import { SuppliersService } from './suppliers.service';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

describe('SuppliersService', () => {
  it('creates a supplier', async () => {
    const prisma = {
      supplier: {
        create: jest.fn().mockResolvedValue({ id: 'sup-1', name: 'Fiber Co' }),
      },
    } as unknown as PrismaService;

    const service = new SuppliersService(prisma);
    const dto = { name: 'Fiber Co', email: 'contact@fiber.co' };

    const result = await service.create(dto);

    expect(prisma.supplier.create).toHaveBeenCalledWith({
      data: {
        name: 'Fiber Co',
        country: undefined,
        category: undefined,
        email: 'contact@fiber.co',
        phone: undefined,
        leadTimeDays: undefined,
        qualityRating: undefined,
      },
    });
    expect(result).toEqual({ id: 'sup-1', name: 'Fiber Co' });
  });
});
