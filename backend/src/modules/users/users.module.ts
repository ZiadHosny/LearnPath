import { Module } from '@nestjs/common';
import { PhotoService } from './photo.service.js';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';

@Module({
  controllers: [UsersController],
  providers: [UsersService, PhotoService],
})
export class UsersModule {}
