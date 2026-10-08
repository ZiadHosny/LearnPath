import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

// Route params for `/:id`; a malformed id is a 400, not a 404.
export class IdParams {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  id!: string;
}
