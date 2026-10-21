import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ClientResponseDto {
  @ApiProperty({ example: 'clx123' })
  id!: string;

  @ApiProperty({ example: 'Galeries Lafayette' })
  name!: string;

  @ApiProperty({ example: 'B2B', enum: ['B2B', 'B2C'] })
  type!: 'B2B' | 'B2C';

  @ApiProperty({ example: 'COMPANY', enum: ['INDIVIDUAL', 'COMPANY'] })
  legalForm!: 'INDIVIDUAL' | 'COMPANY';

  @ApiProperty({ example: 'ACTIVE' })
  status!: string;

  @ApiPropertyOptional({ example: 'achats@galerieslafayette.fr' })
  email?: string;

  @ApiPropertyOptional({ example: '+261340000000' })
  phone?: string;

  @ApiPropertyOptional({ example: 'Service achats' })
  contactName?: string;

  @ApiPropertyOptional({ example: '1234567890' })
  nif?: string;

  @ApiPropertyOptional({ example: '12345 11 2020 0 12345' })
  stat?: string;

  @ApiPropertyOptional({ example: '89421800300012' })
  siret?: string;

  @ApiPropertyOptional({ example: 'Lot II M 45 Bis' })
  addressLine?: string;

  @ApiPropertyOptional({ example: 'Antananarivo' })
  city?: string;

  @ApiPropertyOptional({ example: '101' })
  postalCode?: string;

  @ApiPropertyOptional({ example: 'Madagascar' })
  country?: string;
}
