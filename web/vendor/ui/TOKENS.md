# @ummat/ui-pkg — Design Tokens

The canonical Ummat brand color palette and font tokens exported from this package.
Hex values originate from `@ummat/brand` and are re-exported here for Tailwind preset
consumption.

## Brand Colors

| Token | Hex | Tailwind class |
|---|---|---|
| `colors.lime` | `#C9F27A` | `bg-ummat-lime` / `text-ummat-lime` |
| `colors.green.mid` | `#79C24C` | `bg-ummat-green-mid` |
| `colors.green.dark` | `#1E5E2F` | `bg-ummat-green-dark` |
| `colors.green.deep` | `#0D2F17` | `bg-ummat-green-deep` |

## Font Families

| Token | Stack |
|---|---|
| `ummatFonts.arabic` | `['Noto Naskh Arabic', 'serif']` (Tailwind `font-arabic`) |

## Usage

```ts
// tailwind.config.ts
import preset from '@ummat/ui-pkg/tailwind-preset'

export default {
  presets: [preset],
  content: ['./app/**/*.{ts,tsx}', './node_modules/@ummat/ui-pkg/src/**/*.{ts,tsx}'],
}
```

## References

- ADR-P8-05 (shared packages)
- P8 STACK-PACKAGES T07
- `MIGRATION.md` for the path from `@ummat/ui` (apps/ui) → `@ummat/ui` (packages/ui)
