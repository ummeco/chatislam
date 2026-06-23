# @ummat/consent

GDPR / CCPA cookie consent components and hooks for every Ummat web app.

## Install (workspace only)

```bash
pnpm add @ummat/consent@workspace:* -F <your-app>
```

## Usage

```tsx
import { ConsentBanner, useConsent } from '@ummat/consent'

export function Layout({ children }) {
  return (
    <>
      <ConsentBanner />
      {children}
    </>
  )
}

function AnalyticsGate({ children }) {
  const { categories } = useConsent()
  if (!categories.analytics) return null
  return children
}
```

## Peer deps

React 19. Tailwind preset from `@ummat/brand` for styling.
