import type { Metadata, Viewport } from "next";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "AtRide — Discover communities. Book rides. Ride together.",
    template: "%s | AtRide",
  },
  description:
    "Discover trusted road-adventure communities, explore upcoming rides, and organize every journey in one place.",
  applicationName: "AtRide",
  keywords: ["AtRide", "motorcycle rides", "riding communities", "road trips", "India"],
  icons: {
    icon: [
      { url: "/brand/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/brand/apple-touch-icon-180.png",
  },
  openGraph: {
    type: "website",
    siteName: "AtRide",
    title: "AtRide — Discover communities. Book rides. Ride together.",
    description: "A home for India’s road-adventure communities and their next great ride.",
  },
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#0b0e12",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
