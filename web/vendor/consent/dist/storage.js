import { STORAGE_KEY, CURRENT_CONSENT_VERSION, buildConsentRecord, buildAcceptAllRecord, buildRejectNonEssentialRecord, shouldRePrompt, parseConsentJson, serializeConsent, } from './core/storage-pure.js';
export { STORAGE_KEY, CURRENT_CONSENT_VERSION, buildConsentRecord, buildAcceptAllRecord, buildRejectNonEssentialRecord, shouldRePrompt, };
function isServer() {
    return typeof window === 'undefined';
}
export function readConsent() {
    if (isServer())
        return null;
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        return parseConsentJson(raw);
    }
    catch {
        return null;
    }
}
export function writeConsent(record) {
    if (isServer())
        return;
    try {
        window.localStorage.setItem(STORAGE_KEY, serializeConsent(record));
    }
    catch {
        // Storage may be unavailable in private browsing — fail silently
    }
}
export function clearConsent() {
    if (isServer())
        return;
    try {
        window.localStorage.removeItem(STORAGE_KEY);
    }
    catch {
        // Fail silently
    }
}
//# sourceMappingURL=storage.js.map