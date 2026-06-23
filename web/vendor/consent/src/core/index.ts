/**
 * FILE: packages/consent/src/core/index.ts
 * PURPOSE: Public surface of @ummat/consent/core — platform-agnostic consent primitives.
 *          Zero DOM. Zero React Native. Zero React. Safe for Node, browsers, and RN.
 * INVARIANTS: No platform-specific imports. No react/react-dom/react-native modules.
 * DO NOT: Import from sibling subpaths (./web, ./native) — core must not depend on platform.
 * REFS: ADR-0027
 */
export {
  STORAGE_KEY,
  CURRENT_CONSENT_VERSION,
  buildConsentRecord,
  buildAcceptAllRecord,
  buildRejectNonEssentialRecord,
  shouldRePrompt,
  isValidConsentRecord,
  parseConsentJson,
  serializeConsent,
} from './storage-pure.js'

export type {
  CookieCategory,
  ConsentRecord,
  ConsentVersion,
  ConsentCategories,
  ConsentRegion,
  CookieEntry,
  CookieBannerStrings,
  PreferencesModalStrings,
} from '../types.js'

export { COOKIES } from '../cookie-inventory.js'
export { CURRENT_POLICY_VERSION } from '../version.js'
export type { PolicyVersion } from '../version.js'
export { getMessages, isRtlLocale } from '../i18n.js'
export type { ConsentLocale, ConsentMessages } from '../i18n.js'
