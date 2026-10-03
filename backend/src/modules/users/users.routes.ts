import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { validate } from '../../middleware/validate.js';
import { receivePhoto, savePhoto } from './photo-upload.js';
import { toUserDto } from './user.dto.js';
import { changePasswordSchema, updateProfileSchema } from './users.schemas.js';
import * as usersService from './users.service.js';

export const usersRouter = Router();

usersRouter.use('/users', authenticate);

usersRouter.get('/users/me', async (req, res) => {
  res.json(toUserDto(await usersService.getMe(req.auth!.userId)));
});

usersRouter.patch('/users/me', validate({ body: updateProfileSchema }), async (req, res) => {
  res.json(toUserDto(await usersService.updateProfile(req.auth!.userId, req.body)));
});

usersRouter.put('/users/me/photo', receivePhoto, async (req, res) => {
  res.json(toUserDto(await savePhoto(req.auth!.userId, req.file!.buffer)));
});

usersRouter.post('/users/me/password', validate({ body: changePasswordSchema }), async (req, res) => {
  await usersService.changePassword(req.auth!.userId, req.auth!.sessionId, req.body);
  res.status(204).end();
});
