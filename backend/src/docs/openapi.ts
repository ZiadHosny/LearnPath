import { z } from 'zod';
import type { ErrorCode } from '../lib/errors.js';
import { loginSchema, registerSchema } from '../modules/auth/auth.schemas.js';
import { confirmSchema, requestSchema } from '../modules/password-reset/password-reset.schemas.js';
import { changePasswordSchema, updateProfileSchema } from '../modules/users/users.schemas.js';

// OpenAPI 3.0 description of the API, built from the same Zod schemas the routes validate
// with, so request bodies cannot drift from the code. Served at GET /api/openapi.json (dev)
// and written to backend/openapi.json by `npm run openapi` for import into Apidog / Postman.

type Json = Record<string, unknown>;

function bodySchema(schema: z.ZodType): Json {
  return z.toJSONSchema(schema, { io: 'input', target: 'openapi-3.0', unrepresentable: 'any' }) as Json;
}

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });

const json = (schema: Json, example?: unknown) => ({
  'application/json': { schema, ...(example === undefined ? {} : { example }) },
});

const errorResponse = (description: string, ...codes: ErrorCode[]) => ({
  description: `${description} (${codes.join(', ')})`,
  content: json(ref('Error'), { error: { code: codes[0], message: description } }),
});

const authOk = (description: string) => ({
  description,
  headers: {
    'Set-Cookie': {
      description: 'lp_refresh=<token>; HttpOnly; SameSite=Strict; Path=/api/auth (7 days)',
      schema: { type: 'string' },
    },
  },
  content: json(ref('AuthResponse')),
});

const unauthenticated = errorResponse('Missing, invalid or expired access token', 'UNAUTHENTICATED');
const validationError = errorResponse('Some fields are invalid', 'VALIDATION_ERROR');
const bearer = [{ bearerAuth: [] }];
const refreshCookie = [{ refreshCookie: [] }];

const exampleUser = {
  id: '3f6c2a1e-8a52-4c5e-9a77-1d2f0b7c9e10',
  fullName: 'Ali Hassan',
  email: 'ali@example.com',
  role: 'STUDENT',
  photoUrl: null,
  bio: null,
};

export function buildOpenApiDocument(serverUrl = 'http://localhost:3000') {
  return {
    openapi: '3.0.3',
    info: {
      title: 'LearnPath API',
      version: '0.1.0',
      description:
        'EP-01 Authentication & accounts. Errors always use the `Error` shape. ' +
        'Access tokens last 15 minutes; renew them with POST /api/auth/refresh (cookie).',
    },
    servers: [{ url: serverUrl, description: 'Local API' }],
    tags: [
      { name: 'Auth', description: 'Register, log in, renew, log out' },
      { name: 'Profile', description: 'The signed-in user' },
      { name: 'Password reset', description: 'Forgot password by email' },
    ],
    paths: {
      '/api/auth/register': {
        post: {
          tags: ['Auth'],
          summary: 'Register a new Student account (US-01)',
          requestBody: {
            required: true,
            content: json(bodySchema(registerSchema), {
              fullName: 'Ali Hassan',
              email: 'ali@example.com',
              password: 'abc12345',
              confirmPassword: 'abc12345',
            }),
          },
          responses: {
            201: authOk('Account created and signed in'),
            400: validationError,
            409: errorResponse('Email already registered', 'EMAIL_TAKEN'),
          },
        },
      },
      '/api/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Log in (US-02)',
          requestBody: {
            required: true,
            content: json(bodySchema(loginSchema), {
              email: 'student@learnpath.local',
              password: 'Passw0rd!',
            }),
          },
          responses: {
            200: authOk('Signed in'),
            400: validationError,
            401: errorResponse('Invalid email or password', 'INVALID_CREDENTIALS'),
            403: errorResponse('Account blocked', 'ACCOUNT_BLOCKED'),
            429: {
              ...errorResponse('Too many failed attempts. Try again later.', 'TOO_MANY_ATTEMPTS'),
              headers: {
                'Retry-After': { description: 'Seconds until the block ends', schema: { type: 'integer' } },
              },
            },
          },
        },
      },
      '/api/auth/refresh': {
        post: {
          tags: ['Auth'],
          summary: 'Renew the access token from the refresh cookie',
          security: refreshCookie,
          responses: {
            200: { description: 'New access token with the current role', content: json(ref('AuthResponse')) },
            401: errorResponse('Session ended or expired; cookie cleared', 'SESSION_EXPIRED'),
            403: errorResponse('Account blocked; session ended, cookie cleared', 'ACCOUNT_BLOCKED'),
          },
        },
      },
      '/api/auth/logout': {
        post: {
          tags: ['Auth'],
          summary: 'Log out this device (US-03)',
          security: refreshCookie,
          responses: { 204: { description: 'Session ended (always succeeds); cookie cleared' } },
        },
      },
      '/api/users/me': {
        get: {
          tags: ['Profile'],
          summary: 'Get my profile (US-05)',
          security: bearer,
          responses: {
            200: { description: 'The signed-in user', content: json(ref('User'), exampleUser) },
            401: unauthenticated,
          },
        },
        patch: {
          tags: ['Profile'],
          summary: 'Update my name and bio; email cannot be changed (US-05)',
          security: bearer,
          requestBody: {
            required: true,
            content: json(bodySchema(updateProfileSchema), { fullName: 'Ali Hassan', bio: 'I love maths.' }),
          },
          responses: {
            200: { description: 'Updated user', content: json(ref('User')) },
            400: validationError,
            401: unauthenticated,
          },
        },
      },
      '/api/users/me/photo': {
        put: {
          tags: ['Profile'],
          summary: 'Upload my profile photo, JPG or PNG up to 2 MB (US-05)',
          security: bearer,
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  required: ['photo'],
                  properties: { photo: { type: 'string', format: 'binary' } },
                },
              },
            },
          },
          responses: {
            200: { description: 'Updated user with the new photoUrl', content: json(ref('User')) },
            400: validationError,
            401: unauthenticated,
            413: errorResponse('Photo must be 2 MB or smaller', 'FILE_TOO_LARGE'),
            415: errorResponse('Photo must be a JPG or PNG image', 'UNSUPPORTED_FILE_TYPE'),
          },
        },
      },
      '/api/users/me/password': {
        post: {
          tags: ['Profile'],
          summary: 'Change my password; other devices are signed out (US-06)',
          security: bearer,
          requestBody: {
            required: true,
            content: json(bodySchema(changePasswordSchema), {
              currentPassword: 'Passw0rd!',
              newPassword: 'newpass22',
              confirmPassword: 'newpass22',
            }),
          },
          responses: {
            204: { description: 'Password changed' },
            400: errorResponse(
              'Current password is incorrect, or the new password is invalid',
              'INVALID_CURRENT_PASSWORD',
              'VALIDATION_ERROR',
            ),
            401: unauthenticated,
          },
        },
      },
      '/api/auth/password-reset/request': {
        post: {
          tags: ['Password reset'],
          summary: 'Email a reset link; same answer for any email (US-07)',
          requestBody: {
            required: true,
            content: json(bodySchema(requestSchema), { email: 'student@learnpath.local' }),
          },
          responses: {
            202: {
              description: 'Always the same message',
              content: json(
                { type: 'object', properties: { message: { type: 'string' } } },
                { message: 'If an account exists for this email, a reset link has been sent.' },
              ),
            },
            400: validationError,
          },
        },
      },
      '/api/auth/password-reset/{token}': {
        get: {
          tags: ['Password reset'],
          summary: 'Check whether a reset link is still valid (US-07)',
          parameters: [{ name: 'token', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: {
              description: 'Link is valid',
              content: json({ type: 'object', properties: { valid: { type: 'boolean' } } }, { valid: true }),
            },
            410: errorResponse('Link expired', 'LINK_EXPIRED'),
          },
        },
      },
      '/api/auth/password-reset/confirm': {
        post: {
          tags: ['Password reset'],
          summary: 'Set a new password with a reset link; all devices are signed out (US-07)',
          requestBody: {
            required: true,
            content: json(bodySchema(confirmSchema), {
              token: '<token from the email link>',
              newPassword: 'newpass22',
              confirmPassword: 'newpass22',
            }),
          },
          responses: {
            204: { description: 'Password reset' },
            400: validationError,
            410: errorResponse('Link expired', 'LINK_EXPIRED'),
          },
        },
      },
    },
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        refreshCookie: { type: 'apiKey', in: 'cookie', name: 'lp_refresh' },
      },
      schemas: {
        Role: { type: 'string', enum: ['STUDENT', 'INSTRUCTOR', 'ADMIN'] },
        User: {
          type: 'object',
          required: ['id', 'fullName', 'email', 'role', 'photoUrl', 'bio'],
          properties: {
            id: { type: 'string', format: 'uuid' },
            fullName: { type: 'string' },
            email: { type: 'string', format: 'email' },
            role: ref('Role'),
            photoUrl: { type: 'string', nullable: true, example: '/uploads/avatars/<file>.png' },
            bio: { type: 'string', nullable: true },
          },
        },
        AuthResponse: {
          type: 'object',
          required: ['accessToken', 'expiresIn', 'user'],
          properties: {
            accessToken: { type: 'string', description: 'JWT, send as Authorization: Bearer <token>' },
            expiresIn: { type: 'integer', example: 900, description: 'Seconds' },
            user: ref('User'),
          },
        },
        Error: {
          type: 'object',
          required: ['error'],
          properties: {
            error: {
              type: 'object',
              required: ['code', 'message'],
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
                details: {
                  type: 'array',
                  description: 'Only for VALIDATION_ERROR',
                  items: {
                    type: 'object',
                    properties: { field: { type: 'string' }, message: { type: 'string' } },
                  },
                },
              },
            },
          },
        },
      },
    },
  };
}
