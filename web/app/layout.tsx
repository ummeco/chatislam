import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "next-themes";
// S05-06: @ummat/consent — AI conversation data is NOT analytics cookie; explicit-opt-in per D-P3-21
import { ConsentProvider, CookieBanner, ConsentGatedScript } from "@ummat/consent";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "ChatIslam — Ask Anything About Islam",
    template: "%s | ChatIslam",
  },
  description:
    "AI-powered Islamic guidance — accurate, sourced, always available. Ask questions about Islam, get answers grounded in authentic scholarship.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_BASE_URL ?? "https://chatislam.org"
  ),
  openGraph: {
    siteName: "ChatIslam",
    locale: "en_US",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1E5E2F",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" dir="auto">
      <head>
      </head>
      <body>
        {/* WCAG 2.4.1 — skip navigation (B2-06) */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-brand-dark focus:px-4 focus:py-2 focus:text-white focus:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2"
        >
          Skip to main content
        </a>
        {/* S05-06: ConsentProvider — AI conversation data is functional (not analytics).
            Banner clarifies: chat sessions are NOT classified as tracking cookies. */}
        <ConsentProvider>
          {/* B4-02: next-themes ThemeProvider — persists to localStorage, respects prefers-color-scheme */}
          <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem>
            {children}
          </ThemeProvider>
          {/* S30-T03: GDPR/CCPA consent banner. */}
          <CookieBanner
            strings={{
              body: 'We use cookies to improve your experience. AI conversation history is functional, not an analytics cookie, and is always on. Analytics and marketing cookies are off by default.',
            }}
            privacyPolicyUrl="/legal/privacy"
            cookiePolicyUrl="/legal/cookies"
          />
          {/* S-C-S05-T08: Umami gated behind analytics consent — GDPR Art 7 compliance.
              Removed unconditional <script> in <head>; now only loads after explicit grant. */}
          <ConsentGatedScript
            category="analytics"
            src="https://cloud.umami.is/script.js"
            data-website-id={process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID}
          />
        </ConsentProvider>
      </body>
    </html>
  );
}
