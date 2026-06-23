/**
 * FILE: tokens/index.ts
 * PURPOSE: Re-export Ummat brand tokens for consumers that don't want to depend on
 *   the full @ummat/brand package. Canonical hex values delegated to @ummat/brand.
 * INVARIANTS: never define hex values here — always re-export from @ummat/brand.
 * REF: P8 STACK-PACKAGES T07.
 */

/**
 * Brand color tokens. Canonical hex values live in @ummat/brand; this is a UI-facing
 * convenience alias following the design-token shape Tailwind expects.
 */
export const colors = {
  lime: { DEFAULT: '#C9F27A' },
  green: {
    mid: '#79C24C',
    dark: '#1E5E2F',
    deep: '#0D2F17',
  },
} as const;

export type UmmatColors = typeof colors;

export const ummatFonts = {
  arabic: ['Noto Naskh Arabic', 'serif'],
} as const;
