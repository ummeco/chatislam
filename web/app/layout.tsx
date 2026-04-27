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
      <body>{children}</body>
    </html>
  );
}
