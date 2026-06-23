# @ummat/errors

Canonical `AppError` hierarchy + route wrapper for the Ummat monorepo (T-P7-Q-ERR-01).

## Install (workspace only)

```bash
pnpm add @ummat/errors@workspace:* -F <your-app>
```

## Usage

```ts
import { AppError, withErrorHandler, NotFoundError } from '@ummat/errors'

export const GET = withErrorHandler(async (req, { params }) => {
  const x = await find(params.id)
  if (!x) throw new NotFoundError(`item ${params.id} not found`)
  return Response.json(x)
})
```

`withErrorHandler` converts every `AppError` subclass into the canonical
`@ummat/api-conventions` response envelope.

## Peer deps

`zod` for input-validation error mapping.
