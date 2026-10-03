# Contract: API Compatibility and Additions

**Feature**: [spec.md](../spec.md) · **Baseline**: [001 auth-api.md](../../001-auth-accounts/contracts/auth-api.md)

## 1. Unchanged (binding)

Everything in the 001 REST contract stays byte-for-byte compatible for clients:

- the 11 endpoints, methods and paths;
- request bodies and validation (`400 VALIDATION_ERROR` with `details: [{ field, message }]`);
- every status code, error code and message in the 001 error table;
- `lp_refresh` cookie name, flags (`HttpOnly`, `SameSite=Strict`, `Path=/api/auth`, `Secure`
  per env) and lifetime;
- access token format (HS256 JWT with `sub`, `role`, `sid`, 15 minutes) and the same secret;
- `Retry-After` on `429 TOO_MANY_ATTEMPTS`;
- `/uploads/avatars/<file>` photo URLs.

The 001 API tests are the executable form of this section (SC-001).

## 2. Framework defaults that MUST NOT leak

| Situation | Nest default (must not appear) | Required (001) |
|---|---|---|
| Unknown route | `{ "statusCode": 404, "message": "Cannot GET /x", "error": "Not Found" }` | `404 { error: { code: "NOT_FOUND", message: "Not found" } }` |
| DTO validation failure | `{ "statusCode": 400, "message": [ … ], "error": "Bad Request" }` | `400 { error: { code: "VALIDATION_ERROR", message: "Some fields are invalid", details: [ … ] } }` |
| Malformed JSON body | `400 "Unexpected token …"` | `400 { error: { code: "VALIDATION_ERROR", message: "Request body is not valid JSON" } }` |
| Photo over 2 MB | `413 "File too large"` | `413 { error: { code: "FILE_TOO_LARGE", … } }` |
| Unhandled error | `500 "Internal server error"` | `500 { error: { code: "INTERNAL", message: "Something went wrong" } }` |
| Successful POST without explicit code | `201 Created` | the 001 code (`200` login/refresh, `202` reset request, `204` logout/password) via `@HttpCode` |

## 3. Additions (development only, FR-011 – FR-015)

| Method | Path | Response | Available |
|---|---|---|---|
| GET | `/api/docs` | Swagger UI page | `NODE_ENV !== 'production'` |
| GET | `/api/openapi.json` | OpenAPI 3 document (same URL as today, so Apidog imports keep working) | `NODE_ENV !== 'production'` |

In production both return `404 NOT_FOUND`.

The document MUST contain the 11 endpoints with tags **Auth**, **Profile**, **Password reset**;
request bodies with their rules and examples (from the DTOs); success and error responses;
`bearerAuth` on protected endpoints and `refreshCookie` on refresh/logout.

`npm run openapi` writes the same document to `backend/openapi.json`.

## 4. Developer contract (how endpoints are declared)

| Need | Declaration | Effect |
|---|---|---|
| Open to guests | `@Public()` on the handler or controller | skips `JwtAuthGuard` |
| Any signed-in user | nothing (default) | `401 UNAUTHENTICATED` without a valid token |
| Specific roles | `@Roles('ADMIN')` (one or more) | `403 FORBIDDEN` for other roles |
| Current user | `@CurrentUser() auth` | `{ userId, role, sessionId }` |
| Fixed success code | `@HttpCode(204)` etc. | matches the 001 table |
| Documentation | `@ApiTags`, `@ApiOperation`, `@ApiResponse`, `@ApiProperty` on DTO fields | appears in `/api/docs` and `/api/openapi.json` |

A new feature area is a new folder under `backend/src/modules/<name>/` with
`<name>.module.ts`, `<name>.controller.ts`, `<name>.service.ts`, `dto/`, registered in
`AppModule`.
