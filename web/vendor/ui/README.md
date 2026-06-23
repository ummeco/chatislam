# @ummat/ui

Shared UI component library for all Ummeco web apps. Zero runtime deps on any single app.

## Setup

```css
/* In your app's globals.css: */
@import '@ummat/brand/css';       /* design tokens */
@import '@ummat/ui/styles';       /* component styles */
@import '@ummat/ui/a11y';         /* WCAG 2.2 AA baseline */
```

## Components

All components are WCAG 2.2 AA compliant (2.4.11, 2.5.7, 2.5.8, 2.4.7, 4.1.2).

| Component | Export | Notes |
|---|---|---|
| Button | `@ummat/ui/button` | D-P3-15 light-bg variant, loading state |
| Input | `@ummat/ui/input` | Label, hint, error, ARIA |
| Badge | `@ummat/ui/badge` | 6 variants |
| Card | `@ummat/ui/card` | 4 variants + CardHeader/Body/Footer |
| Modal | `@ummat/ui/modal` | Native `<dialog>`, focus trap |
| Toast | `@ummat/ui/toast` | 4 variants, auto-dismiss |
| Avatar | `@ummat/ui/avatar` | Image fallback to initials |
| Skeleton | `@ummat/ui/skeleton` | Shared keyframe from @ummat/brand |
| Banner | `@ummat/ui/banner` | Full-width status messages |
| DataState | `@ummat/ui/data-state` | 7-state wrapper (B5-01) |
| FocusRing | `@ummat/ui/focus-ring` | Visible focus ring wrapper |
| AsyncScreen | `@ummat/ui/async-screen` | 7-state screen wrapper (P2 robustness spec §3.2) |
| ErrorBoundary | `@ummat/ui/error-boundary` | Route-level error boundary |

## AsyncScreen — 7-State Contract (P2-E2-W02-S02-T01)

`AsyncScreen` renders exactly one of 7 states for async data-bearing screens:

| State | Trigger |
|---|---|
| `loading` | `loading={true}` — fetch in-flight |
| `empty` | `empty={true}` — fetch succeeded, zero results |
| `error` | `error={Error}` — non-retriable failure |
| `populated` | all false — renders `children` |
| `offline` | `offline={true}` — network unavailable |
| `permission-denied` | `permissionDenied={true}` — lacks auth claim |
| `rate-limited` | `rateLimited={true}` — API 429 / quota exceeded |

Priority order: `offline > permissionDenied > rateLimited > loading > error > empty > populated`.
`children` renders **only** in the `populated` state.

```tsx
import { AsyncScreen, ErrorBoundary } from '@ummat/ui'

// Wrap every route-level component in ErrorBoundary
<ErrorBoundary fallback={<p>Something went wrong. Please try again.</p>}>
  <AsyncScreen
    loading={isLoading}
    empty={data?.length === 0}
    error={error ?? null}
    offline={!navigator.onLine}
    permissionDenied={isPermissionDenied}
    rateLimited={isRateLimited}
    retryAfterMs={60_000}
    onRetry={refetch}
    emptySlot={<p>No items yet.</p>}
  >
    <MyContent data={data} />
  </AsyncScreen>
</ErrorBoundary>
```

**React Native**: import `AsyncScreen` from `@ummat/ui/async-screen` — Metro resolves `.native.tsx`
automatically. Uses `NetInfo` for offline detection and `@ummat/native-bridge` for
permission-denied state.

## RTL Support

`Button`, `Input`, and `Modal` include `ltr:` / `rtl:` Tailwind variants for
right-to-left layout mirroring. Requires Tailwind with `dir` attribute on `<html>`.

## Usage

```tsx
import { Button, DataState, Skeleton, AsyncScreen, ErrorBoundary } from '@ummat/ui'

// Light-bg variant (D-P3-15 — green-600 on white)
<Button variant="light-bg">Subscribe</Button>

// 7-state data loading (DataState — simpler, named-state API)
<DataState state="loading" skeleton={<Skeleton lines={3} />}>
  <MyContent />
</DataState>
```
