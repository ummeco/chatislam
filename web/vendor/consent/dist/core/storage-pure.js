export const STORAGE_KEY = 'ummat_consent';
export const CURRENT_CONSENT_VERSION = '2';
export function buildConsentRecord(categories, options = {}) {
    return {
        version: CURRENT_CONSENT_VERSION,
        timestamp: Date.now(),
        categories,
        doNotTrack: options.doNotTrack ?? false,
        doNotSell: options.doNotSell ?? false,
        explicit: true,
    };
}
export function buildAcceptAllRecord(options = {}) {
    return buildConsentRecord({ analytics: true, marketing: true, functional: true }, options);
}
export function buildRejectNonEssentialRecord(options = {}) {
    return buildConsentRecord({ analytics: false, marketing: false, functional: false }, options);
}
export function shouldRePrompt(record) {
    if (!record)
        return true;
    if (record.version !== CURRENT_CONSENT_VERSION)
        return true;
    return false;
}
export function isValidConsentRecord(value) {
    if (!value || typeof value !== 'object')
        return false;
    const obj = value;
    if (typeof obj.version !== 'string')
        return false;
    if (typeof obj.timestamp !== 'number')
        return false;
    if (typeof obj.explicit !== 'boolean')
        return false;
    const cats = obj.categories;
    if (!cats || typeof cats !== 'object')
        return false;
    const c = cats;
    if (typeof c.analytics !== 'boolean')
        return false;
    if (typeof c.marketing !== 'boolean')
        return false;
    if (typeof c.functional !== 'boolean')
        return false;
    return true;
}
/**
 * Parse a stored consent JSON string into a typed record.
 * Returns null on parse failure, version mismatch, or invalid shape.
 * Platform-agnostic: caller is responsible for reading the raw string from
 * whatever storage backend (localStorage / AsyncStorage / cookie).
 */
export function parseConsentJson(raw) {
    if (!raw)
        return null;
    try {
        const parsed = JSON.parse(raw);
        if (!isValidConsentRecord(parsed))
            return null;
        if (parsed.version !== CURRENT_CONSENT_VERSION)
            return null;
        return parsed;
    }
    catch {
        return null;
    }
}
/**
 * Serialise a consent record to JSON for storage.
 */
export function serializeConsent(record) {
    return JSON.stringify(record);
}
//# sourceMappingURL=storage-pure.js.map