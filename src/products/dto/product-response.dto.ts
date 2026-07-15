import { ApiProperty } from '@nestjs/swagger';

export class ProductResponseDto {
  @ApiProperty({ example: 'prd123' })
  id!: string;

  @ApiProperty({ example: 'RAF-CAB-001' })
  ref!: string;

  @ApiProperty({ example: 'Cabas Madagascar' })
  name!: string;

  @ApiProperty({ example: 89 })
  basePrice!: number;

  @ApiProperty({ example: 'ACTIVE' })
  status!: string;

  @ApiProperty({
    example: 'COMPANY',
    enum: ['COMPANY', 'CLIENT'],
    description: 'COMPANY = catalogue / vente. CLIENT = modèle propriété d\'un client.',
  })
  ownership!: 'COMPANY' | 'CLIENT';

  @ApiProperty({
    example: null,
    nullable: true,
    description: 'Client propriétaire si ownership = CLIENT.',
  })
  ownerClientId!: string | null;
}
