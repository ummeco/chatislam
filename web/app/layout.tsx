import type { Metadata, Viewport } from "next";
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
      <body>
        {/* WCAG 2.4.1 — skip navigation (B2-06) */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-brand-dark focus:px-4 focus:py-2 focus:text-white focus:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2"
        >
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
