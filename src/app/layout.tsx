import type { Metadata, Viewport } from "next";
import { DM_Sans, Syne } from "next/font/google";
import { SiteChrome } from "@/components/SiteChrome";
import "./globals.css";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "Chorus — Party Karaoke",
  description:
    "Karaoke for smart TV and phone. Open How to for a step-by-step party guide.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${syne.variable} ${dmSans.variable} h-full`}>
      <body className="min-h-full antialiased">
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
