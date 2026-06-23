/**
 * ConsentGatedScript — renders a Next.js Script tag only when the specified
 * consent category has been accepted.
 *
 * S05-05/06/12: Consent-gate for analytics scripts (e.g. Umami) per D-P3-21.
 * Drop-in replacement for <Script> anywhere analytics / marketing scripts live.
 *
 * Usage:
 *   <ConsentGatedScript
 *     category="analytics"
 *     src={`${process.env.NEXT_PUBLIC_UMAMI_HOST_URL}/script.js`}
 *     data-website-id={process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID}
 *     strategy="afterInteractive"
 *   />
 */
import React from 'react';
export interface ConsentGatedScriptProps {
    /** Consent category that must be accepted before the script loads. */
    category: keyof import('./types.js').ConsentCategories;
    /** Script src URL. */
    src: string;
    /** Next.js Script loading strategy. Default: "afterInteractive". */
    strategy?: 'afterInteractive' | 'lazyOnload' | 'beforeInteractive';
    /** Any additional data-* attributes passed to the <script> element. */
    [key: string]: unknown;
}
export declare function ConsentGatedScript({ category, src, strategy, ...rest }: ConsentGatedScriptProps): React.JSX.Element | null;
//# sourceMappingURL=ConsentGatedScript.d.ts.map