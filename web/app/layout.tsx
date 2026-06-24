import type { Metadata, Viewport } from "next";
// S05-06: @ummat/consent — AI conversation data is NOT analytics cookie; explicit-opt-in per D-P3-21
// ClientProviders wraps ThemeProvider + ConsentProvider as a client component so this layout
// stays a server component (prevents useState null in Next.js 15 prerender workers).
import ClientProviders from "./ClientProviders";
import { Inter, Noto_Nastaliq_Urdu } from "next/font/google";
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import "./globals.css";

// B1-03: Self-hosted via next/font/google — no Google CDN calls at runtime.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

// Noto Nastaliq Urdu: loaded only for ur/fa locales per P2-E6 i18n spec.
// Self-hosted via next/font/google. preload: false — not needed on all pages.
const notoNastaliqUrdu = Noto_Nastaliq_Urdu({
  variable: "--font-nastaliq",
  subsets: ["arabic"],
  weight: ["400", "700"],
  display: "swap",
  preload: false,
});

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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // P2-E6-W01-S01-T01: dynamic locale resolution via NEXT_LOCALE cookie / Accept-Language.
  // RTL applied for ar/ur/fa (AC-02). Noto Nastaliq Urdu loaded conditionally for ur/fa (AC-03).
  const locale = await getLocale();
  const messages = await getMessages();
  const isRtl = ['ar', 'ur', 'fa'].includes(locale);

  return (
    <html lang={locale} dir={isRtl ? 'rtl' : 'ltr'}>
      <head>
      </head>
      <body
        className={`${inter.variable} ${['ur', 'fa'].includes(locale) ? notoNastaliqUrdu.variable : ''} antialiased`}
      >
        {/* WCAG 2.4.1 — skip navigation (B2-06) */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-brand-dark focus:px-4 focus:py-2 focus:text-white focus:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2"
        >
          Skip to main content
        </a>
        {/* S05-06: ClientProviders — ConsentProvider + ThemeProvider in a client boundary.
            Banner clarifies: chat sessions are NOT classified as tracking cookies.
            B4-02: ThemeProvider persists to localStorage, respects prefers-color-scheme. */}
        <ClientProviders umamiWebsiteId={process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID}>
          <NextIntlClientProvider locale={locale} messages={messages}>
            {children}
          </NextIntlClientProvider>
        </ClientProviders>
      </body>
    </html>
  );
}
