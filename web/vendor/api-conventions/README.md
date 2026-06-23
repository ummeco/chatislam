# @ummat/api-conventions

Canonical API conventions for every Ummat HTTP handler: response shapes, error codes,
`request_id` middleware, and zod-error mapping.

## Install (workspace only)

```bash
pnpm add @ummat/api-conventions@workspace:* -F <your-app>
```

## Usage

```ts
import { ok, fail, withRequestId } from '@ummat/api-conventions'

export const POST = withRequestId(async (req) => {
  const data = await someBusinessLogic(req)
  return ok(data)
})
```

Every response carries `{ data | error, request_id }`. Errors map to a stable
`error.code` taxonomy so clients can switch on a finite enum.

## Peer deps

None — pure TS. Brings its own zod for error mapping.
