# Data Model: Move the API to NestJS

**Feature**: [spec.md](spec.md)

**No changes.** FR-008 forbids changes to the data store. The model is exactly
[001 data-model.md](../001-auth-accounts/data-model.md):

| Table | Change |
|---|---|
| `users` | none |
| `sessions` | none |
| `login_attempts` | none |
| `password_reset_tokens` | none |

- `backend/prisma/schema.prisma`: models, enums and columns unchanged. The only edit is to the
  `generator client` block (`moduleFormat = "cjs"`, research R2), which changes the generated
  TypeScript client, not the database.
- `backend/prisma/migrations/`: no new migration. `npx prisma migrate status` on an existing
  database MUST report "up to date" after the switch.
- `backend/prisma/seed.ts`: same four accounts.

## Request shapes (DTOs)

The request bodies are not stored data, but they are now classes. Each DTO mirrors one 001 Zod
schema field for field; the rules and messages are listed in [research.md](research.md) R4 and
the binding shapes are in [001 auth-api.md](../001-auth-accounts/contracts/auth-api.md).

| DTO | Replaces (001) | Used by |
|---|---|---|
| `RegisterDto` | `registerSchema` | `POST /api/auth/register` |
| `LoginDto` | `loginSchema` | `POST /api/auth/login` |
| `UpdateProfileDto` | `updateProfileSchema` | `PATCH /api/users/me` |
| `ChangePasswordDto` | `changePasswordSchema` | `POST /api/users/me/password` |
| `ResetRequestDto` | `requestSchema` | `POST /api/auth/password-reset/request` |
| `ResetConfirmDto` | `confirmSchema` | `POST /api/auth/password-reset/confirm` |
| `EnvironmentVariables` | `envSchema` | app start-up |

Response shapes (`UserDto`, `AuthResponse`, error body) are unchanged; they get Swagger-only
response classes (`UserResponseDto`, `AuthResponseDto`, `ErrorResponseDto`) for documentation.
