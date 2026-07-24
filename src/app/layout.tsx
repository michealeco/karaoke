import type { Metadata } from "next";
import { DM_Sans, Syne } from "next/font/google";
import Link from "next/link";
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
  description: "Upload karaoke MP4s, open a room, and pass the queue around.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${syne.variable} ${dmSans.variable} h-full`}>
      <body className="min-h-full antialiased">
        <div className="site-shell">
          <nav className="site-nav">
            <Link href="/" className="brand">
              Chorus
            </Link>
            <div className="nav-links">
              <Link href="/library">Library</Link>
              <Link href="/">Rooms</Link>
            </div>
          </nav>
          {children}
        </div>
      </body>
    </html>
  );
}
