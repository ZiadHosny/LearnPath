import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from '../../users/dto/user-response.dto.js';

export class AuthResponseDto {
  @ApiProperty({ description: 'JWT; send as Authorization: Bearer <token>' }) accessToken!: string;
  @ApiProperty({ example: 900, description: 'Seconds until the access token expires' }) expiresIn!: number;
  @ApiProperty({ type: UserResponseDto }) user!: UserResponseDto;
}
