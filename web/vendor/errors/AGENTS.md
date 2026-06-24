# AGENTS.md — @ummat/errors

## Purpose

Canonical typed error infrastructure for the Ummat platform.

- **Result<T, E>**: Discriminated union for async operations (never throw across async boundaries)
- **UmmatError**: Interface for error shape (code, message, cause, context)
- **ErrorCode**: Enum of 7 canonical error codes (NETWORK_OFFLINE, PERMISSION_DENIED, RATE_LIMITED, NOT_FOUND, VALIDATION, INTERNAL, THEOLOGY_GATE)
- **withErrorBoundary**: Route handler wrapper that catches all errors and returns Result<T, UmmatError>
- **generateIdempotencyKey**: UUID v4 generator for idempotent request deduplication

Spec: P2 Robustness Framework spec §4 (typed error handling)

## Usage Pattern

### Result<T, E> — Return type for all async operations

```typescript
import { ok, err, Result } from '@ummat/errors';

async function fetchUser(id: string): Promise<Result<User, UmmatError>> {
  try {
    const user = await db.query('SELECT * FROM users WHERE id = ?', [id]);
    if (!user) return err(createError(ErrorCode.NOT_FOUND, 'User not found'));
    return ok(user);
  } catch (cause) {
    return err(createError(ErrorCode.INTERNAL, 'Database error', { cause }));
  }
}

// Caller destructures:
const result = await fetchUser('123');
if (result.ok) {
  console.log(result.value); // User
} else {
  console.error(result.error.code, result.error.message);
}
```

### UmmatError — Canonical error shape

```typescript
interface UmmatError {
  code: ErrorCode;           // one of 7 canonical codes
  message: string;           // human-readable, safe for client display
  cause?: unknown;           // original error; for logging only
  context?: Record<...>;     // diagnostic metadata (request_id, user_id, etc.)
  status?: number;           // HTTP status (populated by route wrapper)
}
```

### withErrorBoundary — Route handler wrapper

```typescript
import { withErrorBoundary } from '@ummat/errors/route-wrapper';

export const POST = withErrorBoundary(async (req: Request) => {
  const body = await req.json();
  if (!body.email) {
    // Throw — the wrapper catches and converts to Result
    throw new Error('Missing email');
  }
  const user = await db.createUser(body);
  return ok({ id: user.id }); // or return plain value; wrapper handles both
});

// Route returns Result<T, UmmatError>
// Caller checks result.ok to access value or error
```

### ErrorCode — The 7 canonical codes

- **NETWORK_OFFLINE**: Network unavailable (503 Service Unavailable)
- **PERMISSION_DENIED**: User lacks required role/auth claim (403 Forbidden)
- **RATE_LIMITED**: Quota exceeded (429 Too Many Requests)
- **NOT_FOUND**: Resource not found (404 Not Found)
- **VALIDATION**: Invalid input (422 Unprocessable Entity)
- **INTERNAL**: Unexpected error (500 Internal Server Error)
- **THEOLOGY_GATE**: Content blocked for religious correctness (451 Unavailable For Legal Reasons)

## Invariants

- **Never throw across async boundaries.** Use Result<T, E> instead.
- **Never catch with catch(e: any).** Always use toUmmatError(e) for coercion.
- **ErrorCode is a closed set.** No arbitrary string codes; use the enum.
- **cause and context never leak to client.** The route wrapper serializes only code, message, status.
- **generateIdempotencyKey() must be called per request**, not cached. Returns a new UUID v4 each time.

## Sentry Integration

Apps wire Sentry capture via the `onError` callback on `withErrorBoundary`:

```typescript
import * as Sentry from '@sentry/node';

export const POST = withErrorBoundary(
  async (req: Request) => { /* ... */ },
  {
    onError: (error, request) => {
      Sentry.captureException(error, {
        contexts: {
          request: { url: request.url },
          ...error.context,
        },
      });
    },
  }
);
```

## DO NOT

- Throw bare `Error` from async code — wrap in Result<T, UmmatError>
- Use arbitrary error.code strings — only the 7 ErrorCode enum values
- Store sensitive data in error.context — it may leak to logging
- Catch unknown exceptions without calling toUmmatError() for coercion
- Cache the result of generateIdempotencyKey() — call once per request

## Test commands

```bash
pnpm --filter @ummat/errors test        # 38 unit tests covering all 7 ErrorCode values, Result ops, route wrapper
pnpm --filter @ummat/errors build       # tsup: ESM + CJS + .d.ts
pnpm --filter @ummat/errors type-check  # tsc --noEmit
pnpm --filter @ummat/errors lint        # eslint src/
```
