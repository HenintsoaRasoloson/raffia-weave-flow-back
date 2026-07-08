import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ClientResponseDto {
  @ApiProperty({ example: 'clx123' })
  id!: string;

  @ApiProperty({ example: 'Galeries Lafayette' })
  name!: string;

  @ApiProperty({ example: 'B2B', enum: ['B2B', 'B2C'] })
  type!: 'B2B' | 'B2C';

  @ApiProperty({ example: 'ACTIVE' })
  status!: string;

  @ApiPropertyOptional({ example: 'achats@galerieslafayette.fr' })
  email?: string;
}
