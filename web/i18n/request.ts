import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';
import { routing } from './routing';

/**
 * FILE:        chatislam/web/i18n/request.ts
 * PURPOSE:     Resolve per-request locale for next-intl.
 *              Priority: NEXT_LOCALE cookie → Accept-Language header → default 'en'.
 * CONSTRAINTS:
 *   - Cookie NEXT_LOCALE set by LanguageSelector component on switch
 *   - Must resolve synchronously-ish (no DB calls here)
 * REF:         P2-E6-W01-S01-T01 AC-02
 */

type Locale = (typeof routing.locales)[number];

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const headerStore = await headers();

  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value;
  const acceptLang = headerStore.get('accept-language')?.split(',')[0]?.split('-')[0];

  let locale: Locale = routing.defaultLocale;

  if (cookieLocale && routing.locales.includes(cookieLocale as Locale)) {
    locale = cookieLocale as Locale;
  } else if (acceptLang && routing.locales.includes(acceptLang as Locale)) {
    locale = acceptLang as Locale;
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
