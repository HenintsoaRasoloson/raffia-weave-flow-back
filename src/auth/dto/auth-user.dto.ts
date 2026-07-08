import { ApiProperty } from '@nestjs/swagger';

export class AuthUserDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ required: false, nullable: true })
  name: string | null;

  @ApiProperty({
    enum: [
      'GERANT',
      'RESPONSABLE_GENERAL',
      'RESPONSABLE_PRODUCTION',
      'RESPONSABLE_LIVRAISON',
      'RESPONSABLE_FINANCIER_STOCKS',
    ],
  })
  role: string;

  @ApiProperty()
  isAdmin: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}