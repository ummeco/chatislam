# `@ummat/ui/a11y` — Accessibility primitives

Canonical components and hooks consumed by every Ummeco web app to satisfy
WCAG 2.2 AA. Land-once / consume-everywhere.

## What lives here

| Export | Spec | Purpose |
| --- | --- | --- |
| `<LiveRegions />` | T-P7-Q-A11Y-01 | Mounts ONE polite + ONE assertive ARIA live region per page. |
| `useLiveAnnounce()` | T-P7-Q-A11Y-01 | Hook to push messages into the regions from any descendant. |
| `<FocusTrap />` | T-P7-Q-A11Y-02 | Focus trap for non-dialog overlays (drawers, popovers). |
| `useReturnFocus()` | T-P7-Q-A11Y-02 | Captures + restores focus across overlay open/close. |
| `<SkipLink />` | T-P7-Q-A11Y-03 | "Skip to main" link as first focusable element. |

## Mounting (one-time per app root layout)

```tsx
// app/layout.tsx
import { LiveRegions, SkipLink } from '@ummat/ui'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr">
      <body>
        <SkipLink>Skip to main content</SkipLink>
        <LiveRegions />
        <main id="main" tabIndex={-1}>
          {children}
        </main>
      </body>
    </html>
  )
}
```

For localized SkipLink text, pass the translated label via `children`:

```tsx
<SkipLink>{t('common.a11y.skipToMain')}</SkipLink>
```

## Announcing transient updates

```tsx
import { useLiveAnnounce } from '@ummat/ui'

function DonationForm() {
  const announce = useLiveAnnounce()

  async function onSubmit() {
    try {
      await api.donate()
      announce('Donation received', 'polite')
    } catch (err) {
      announce('Donation failed — please try again', 'assertive')
    }
  }
  // ...
}
```

**Politeness:**
- `polite` — non-interruptive (waits for the screen reader to finish current speech).
- `assertive` — interruptive (drops current speech, announces immediately). Use sparingly:
  errors, urgent state changes only.

**Anti-pattern:** mounting `<LiveRegions />` more than once per page. Multiple live regions
cause unpredictable behavior across screen readers. Mount once at the root layout and
consume from descendants via `useLiveAnnounce()`.

## Focus trap (non-dialog overlays)

```tsx
import { FocusTrap, useReturnFocus } from '@ummat/ui'
import { useRef, useState } from 'react'

function Drawer() {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  useReturnFocus(open, triggerRef)

  return (
    <>
      <button ref={triggerRef} onClick={() => setOpen(true)}>Open</button>
      {open && (
        <FocusTrap active onEscape={() => setOpen(false)} returnFocusTo={triggerRef}>
          <aside role="dialog" aria-label="Settings">
            ...
          </aside>
        </FocusTrap>
      )}
    </>
  )
}
```

For native `<dialog>` with `showModal()` (used by `<Modal />`), the browser provides its
own modal focus trap; `<FocusTrap />` is for everything else.

## CSS dependency

`@ummat/ui/a11y.css` provides:
- `.ummat-sr-only` — visually-hidden utility used by `<LiveRegions />`.
- `.ummat-skip-link` — fallback styling for `<SkipLink />` (apps without Tailwind).
- Focus-visible defaults, target-size minimums, RTL helpers.

Import in every app's globals.css after `@ummat/brand/css`.
