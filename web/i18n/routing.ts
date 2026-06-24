import { defineRouting } from 'next-intl/routing';

/**
 * FILE:        chatislam/web/i18n/routing.ts
 * PURPOSE:     next-intl routing config — supported locales + detection strategy.
 *              RTL locales (ar/ur/fa) handled in layout.tsx via dir attribute.
 * CONSTRAINTS:
 *   - localePrefix: 'never' — chat URLs stay clean (no /ar/ prefix)
 *   - Cookie NEXT_LOCALE takes precedence; falls back to Accept-Language header
 * REF:         P2-E6-W01-S01-T01 AC-02
 */

export const routing = defineRouting({
  // Required locales (AC-01 gate: 5 at 100% key coverage)
  locales: ['en', 'ar', 'ur', 'fa', 'id'],
  // Default locale — English
  defaultLocale: 'en',
  // Never prefix URLs with locale — chat routes stay clean
  localePrefix: 'never',
  // Detect locale from cookie and Accept-Language header
  localeDetection: true,
});

export type Locale = (typeof routing.locales)[number];
