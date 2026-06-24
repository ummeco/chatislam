/**
 * FILE: packages/consent/src/core/storage-pure.ts
 * PURPOSE: Platform-agnostic consent record building, validation, and lifecycle predicates.
 *          Zero DOM access. Zero AsyncStorage. Pure functions only.
 * INVARIANTS: Never import `window`, `document`, `localStorage`, `AsyncStorage`, or any
 *             react/react-dom/react-native module.
 * DO NOT: Add read/write IO here. IO lives in `./web/storage.ts` (DOM) or
 *         `@ummat/consent-native/storage` (AsyncStorage).
 * REFS: ADR-0027 — Package RN-Compat Strategy
 */
import type { ConsentRecord, ConsentVersion, ConsentCategories } from '../types.js';
export declare const STORAGE_KEY = "ummat_consent";
export declare const CURRENT_CONSENT_VERSION: ConsentVersion;
export declare function buildConsentRecord(categories: ConsentCategories, options?: {
    doNotTrack?: boolean;
    doNotSell?: boolean;
}): ConsentRecord;
export declare function buildAcceptAllRecord(options?: {
    doNotTrack?: boolean;
    doNotSell?: boolean;
}): ConsentRecord;
export declare function buildRejectNonEssentialRecord(options?: {
    doNotTrack?: boolean;
    doNotSell?: boolean;
}): ConsentRecord;
export declare function shouldRePrompt(record: ConsentRecord | null): boolean;
export declare function isValidConsentRecord(value: unknown): value is ConsentRecord;
/**
 * Parse a stored consent JSON string into a typed record.
 * Returns null on parse failure, version mismatch, or invalid shape.
 * Platform-agnostic: caller is responsible for reading the raw string from
 * whatever storage backend (localStorage / AsyncStorage / cookie).
 */
export declare function parseConsentJson(raw: string | null): ConsentRecord | null;
/**
 * Serialise a consent record to JSON for storage.
 */
export declare function serializeConsent(record: ConsentRecord): string;
//# sourceMappingURL=storage-pure.d.ts.map