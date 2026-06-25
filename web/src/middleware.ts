/**
 * middleware.ts — Per-request locale resolution.
 *
 * PURPOSE: Resolve the active UI locale once per request (NEXT_LOCALE cookie →
 *   Accept-Language → default) and expose it via `Astro.locals.locale`. Pages and
 *   the BaseLayout read it to set `<html lang dir>` and to localize content, so
 *   RTL locales (ar, ur, fa) render `dir="rtl"` with translated copy.
 *
 * CONSTRAINTS: No Next.js imports. Runs for on-demand (SSR) routes only.
 * REF: P2-E3-W02-S02-T02 · D-P2-STACK-CANON
 */

import { defineMiddleware } from 'astro:middleware'
import { resolveLocale } from './lib/i18n'

export const onRequest = defineMiddleware((context, next) => {
  // Prerendered (static) pages cannot read per-request cookies/headers — they
  // apply the NEXT_LOCALE cookie on the client instead — so skip resolution to
  // avoid `Astro.request.headers` access warnings during the build.
  if (context.isPrerendered) return next()

  const cookieLocale = context.cookies.get('NEXT_LOCALE')?.value
  const acceptLanguage = context.request.headers.get('accept-language')
  context.locals.locale = resolveLocale(cookieLocale, acceptLanguage)
  return next()
})
