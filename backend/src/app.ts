import cookieParser from 'cookie-parser';
import express, { type Router } from 'express';
import helmet from 'helmet';
import { uploadsDir } from './config/paths.js';
import { buildOpenApiDocument } from './docs/openapi.js';
import { errorHandler, notFound } from './middleware/error-handler.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { passwordResetRouter } from './modules/password-reset/password-reset.routes.js';
import { usersRouter } from './modules/users/users.routes.js';

export interface AppOptions {
  // Extra routers mounted after the feature routes; used by tests.
  extraRouters?: Array<[path: string, router: Router]>;
}

export function createApp(options: AppOptions = {}) {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-origin' } }));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  app.use('/uploads', express.static(uploadsDir, { index: false, fallthrough: true }));

  // API description for Apidog / Postman; not exposed in production.
  if (process.env.NODE_ENV !== 'production') {
    app.get('/api/openapi.json', (req, res) => {
      res.json(buildOpenApiDocument(`${req.protocol}://${req.get('host')}`));
    });
  }

  app.use('/api', authRouter);
  app.use('/api', passwordResetRouter);
  app.use('/api', usersRouter);

  for (const [path, router] of options.extraRouters ?? []) {
    app.use(path, router);
  }

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
