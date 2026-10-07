import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule, type OpenAPIObject } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import type { ErrorRequestHandler } from 'express';
import helmet from 'helmet';
import { AppError } from './common/http/app-error.js';
import { requestId } from './common/http/request-id.middleware.js';
import { AppLogger } from './common/logging/app-logger.service.js';
import { createRequestLogger } from './common/logging/request-logger.middleware.js';
import { uploadsDir } from './config/paths.js';

// express.json() failures keep their own status, as in 001 (400 parse error, 413 too large).
// Converted here, right after the parser, because Nest would otherwise turn a parse error into
// a generic BadRequestException and lose which kind of failure it was.
const bodyParserErrors: ErrorRequestHandler = (err, _req, _res, next) => {
  const type = (err as { type?: string } | null)?.type;
  if (type === 'entity.parse.failed' || type === 'entity.too.large') {
    const status = (err as { status?: number }).status ?? 400;
    next(new AppError('VALIDATION_ERROR', { status, message: 'Request body is not valid JSON' }));
    return;
  }
  next(err);
};

// The API description, generated from controller and DTO decorators. Used by /api/docs,
// /api/openapi.json and `npm run openapi`, so all three are always the same document.
export function buildOpenApiDocument(app: NestExpressApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('LearnPath API')
    .setDescription(
      'Errors always use the ErrorResponseDto shape. Access tokens last 15 minutes; ' +
        'renew them with POST /api/auth/refresh (lp_refresh cookie).',
    )
    .setVersion('0.2.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'bearerAuth')
    .addCookieAuth('lp_refresh', { type: 'apiKey', in: 'cookie' }, 'refreshCookie')
    .build();
  return SwaggerModule.createDocument(app, config);
}

// Every app-level setting in one place, shared by main.ts, the tests and the OpenAPI export,
// so the three never differ. Create the app with { bodyParser: false } before calling this.
export function configureApp(app: NestExpressApplication): NestExpressApplication {
  // NestJS's own messages go through our logger too (create the app with bufferLogs: true).
  const logger = app.get(AppLogger);
  app.useLogger(logger);

  app.setGlobalPrefix('api');
  app.disable('x-powered-by');
  app.use(requestId); // first, so every later log line and response has the id
  app.use(createRequestLogger(logger));
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-origin' } }));
  app.use(cookieParser());
  app.useBodyParser('json', { limit: '100kb' });
  app.use(bodyParserErrors);
  app.useStaticAssets(uploadsDir, { prefix: '/uploads', index: false });

  // Development only (FR-014): Swagger UI at /api/docs, the document at /api/openapi.json.
  if (process.env.NODE_ENV !== 'production') {
    SwaggerModule.setup('api/docs', app, () => buildOpenApiDocument(app), {
      jsonDocumentUrl: 'api/openapi.json',
      useGlobalPrefix: false,
    });
  }
  return app;
}
