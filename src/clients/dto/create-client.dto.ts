import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateClientDto {
  @ApiProperty({ example: 'Galeries Lafayette' })
  name!: string;

  @ApiProperty({ example: 'B2B', enum: ['B2B', 'B2C'] })
  type!: 'B2B' | 'B2C';

  @ApiPropertyOptional({ example: 'ACTIVE', enum: ['ACTIVE', 'PROSPECT', 'LOYAL', 'INACTIVE'] })
  status?: 'ACTIVE' | 'PROSPECT' | 'LOYAL' | 'INACTIVE';

  @ApiPropertyOptional({ example: 'achats@galerieslafayette.fr' })
  email?: string;

  @ApiPropertyOptional({ example: 'Service achats' })
  contactName?: string;

  @ApiPropertyOptional({ example: '89421800300012' })
  siret?: string;

  @ApiPropertyOptional({ example: '40 boulevard Haussmann' })
  addressLine?: string;

  @ApiPropertyOptional({ example: 'Paris' })
  city?: string;

  @ApiPropertyOptional({ example: '75009' })
  postalCode?: string;

  @ApiPropertyOptional({ example: 'France' })
  country?: string;
}
