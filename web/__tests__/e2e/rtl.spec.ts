import { test, expect, BrowserContext } from '@playwright/test'

/**
 * RTL visual regression tests for ChatIslam.
 *
 * ChatIslam uses a NEXT_LOCALE cookie for locale switching (not URL prefixes).
 * Arabic (ar) and Urdu (ur) are RTL locales; English (en) is LTR.
 *
 * B3-07: RTL screenshot baselines — verifies dir/lang attributes and absence of
 * horizontal overflow in Arabic and Urdu locale modes.
 */

/** Helper — set NEXT_LOCALE cookie on the test context. */
async function setLocaleCookie(context: BrowserContext, locale: string): Promise<void> {
  await context.addCookies([
    {
      name: 'NEXT_LOCALE',
      value: locale,
      domain: 'localhost',
      path: '/',
    },
  ])
}

/** Helper — clear NEXT_LOCALE cookie. */
async function clearLocaleCookie(context: BrowserContext): Promise<void> {
  await context.clearCookies({ name: 'NEXT_LOCALE' })
}

// ---------------------------------------------------------------------------
// Arabic locale — homepage
// ---------------------------------------------------------------------------

test.describe('RTL layout — Arabic locale', () => {
  test.beforeEach(async ({ context }) => {
    await setLocaleCookie(context, 'ar')
  })

  test('html element has dir=rtl in Arabic locale', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    const dir = await page.evaluate(() => document.documentElement.dir)
    expect(dir).toBe('rtl')
  })

  test('html element has lang=ar in Arabic locale', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    const lang = await page.evaluate(() => document.documentElement.lang)
    expect(lang).toBe('ar')
  })

  test('body contains at least one Arabic character in Arabic locale', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.evaluate(() => document.body.innerText)
    // Arabic Unicode block: U+0600–U+06FF
    expect(bodyText).toMatch(/[؀-ۿ]/)
  })

  test('no horizontal scroll in Arabic RTL mode', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth
    })
    expect(hasOverflow).toBe(false)
  })

  test('RTL baseline screenshot — homepage Arabic', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    // Baseline: run once with --update-snapshots to create; subsequent runs compare.
    await expect(page).toHaveScreenshot('homepage-ar-rtl.png', {
      fullPage: false,
      animations: 'disabled',
    })
  })
})

// ---------------------------------------------------------------------------
// Urdu locale — homepage
// ---------------------------------------------------------------------------

test.describe('RTL layout — Urdu locale', () => {
  test.beforeEach(async ({ context }) => {
    await setLocaleCookie(context, 'ur')
  })

  test('html element has dir=rtl in Urdu locale', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    const dir = await page.evaluate(() => document.documentElement.dir)
    expect(dir).toBe('rtl')
  })

  test('html element has lang=ur in Urdu locale', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    const lang = await page.evaluate(() => document.documentElement.lang)
    expect(lang).toBe('ur')
  })

  test('no horizontal scroll in Urdu RTL mode', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth
    })
    expect(hasOverflow).toBe(false)
  })

  test('RTL baseline screenshot — homepage Urdu', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveScreenshot('homepage-ur-rtl.png', {
      fullPage: false,
      animations: 'disabled',
    })
  })
})

// ---------------------------------------------------------------------------
// Default English locale — no RTL
// ---------------------------------------------------------------------------

test.describe('LTR layout — English locale (default)', () => {
  test('html element has dir=ltr when no NEXT_LOCALE cookie is set', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    const dir = await page.evaluate(() => document.documentElement.dir)
    // LTR: browser may return 'ltr' or empty string — both are valid.
    expect(['ltr', '']).toContain(dir)
  })
})

// ---------------------------------------------------------------------------
// Locale switching — ar → en
// ---------------------------------------------------------------------------

test.describe('Locale switching — Arabic to English', () => {
  test('switching from ar cookie to en produces LTR on reload', async ({ context, page }) => {
    // Step 1 — Arabic
    await setLocaleCookie(context, 'ar')
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    const dirRtl = await page.evaluate(() => document.documentElement.dir)
    expect(dirRtl).toBe('rtl')

    // Step 2 — switch to English
    await clearLocaleCookie(context)
    await setLocaleCookie(context, 'en')
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    const dirLtr = await page.evaluate(() => document.documentElement.dir)
    expect(['ltr', '']).toContain(dirLtr)
  })
})
