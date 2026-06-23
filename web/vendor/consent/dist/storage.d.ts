/**
 * FILE: packages/consent/src/storage.ts
 * PURPOSE: Browser (DOM) consent storage adapter — localStorage IO.
 *          Delegates all pure logic to ./core/storage-pure.ts.
 * INVARIANTS: Only loaded in web/Next.js contexts. Never imported from RN.
 * DO NOT: Add pure logic here — it belongs in ./core/storage-pure.ts.
 * REFS: ADR-0027
 */
import type { ConsentRecord } from './types.js';
import { STORAGE_KEY, CURRENT_CONSENT_VERSION, buildConsentRecord, buildAcceptAllRecord, buildRejectNonEssentialRecord, shouldRePrompt } from './core/storage-pure.js';
export { STORAGE_KEY, CURRENT_CONSENT_VERSION, buildConsentRecord, buildAcceptAllRecord, buildRejectNonEssentialRecord, shouldRePrompt, };
export declare function readConsent(): ConsentRecord | null;
export declare function writeConsent(record: ConsentRecord): void;
export declare function clearConsent(): void;
//# sourceMappingURL=storage.d.ts.map