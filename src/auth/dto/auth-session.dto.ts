import { ApiProperty } from '@nestjs/swagger';
import { AuthUserDto } from './auth-user.dto';

export class AuthSessionDto {
  @ApiProperty({ type: () => AuthUserDto })
  user!: AuthUserDto;

  @ApiProperty({ type: String, example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken!: string;

  @ApiProperty({ type: String })
  refreshToken!: string;

  @ApiProperty({ type: String, example: 'Bearer' })
  tokenType!: 'Bearer';

  @ApiProperty({ type: String, example: '15m' })
  expiresIn!: string;
}
