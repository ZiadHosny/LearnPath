import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ example: 'Ali Hassan' }) fullName!: string;
  @ApiProperty({ format: 'email', example: 'ali@example.com' }) email!: string;
  @ApiProperty({ enum: ['STUDENT', 'INSTRUCTOR', 'ADMIN'], example: 'STUDENT' }) role!: string;
  @ApiProperty({ type: String, nullable: true, example: '/uploads/avatars/<file>.png' }) photoUrl!: string | null;
  @ApiProperty({ type: String, nullable: true }) bio!: string | null;
}
