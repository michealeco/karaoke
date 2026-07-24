"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutMode } from "@/lib/useLayoutMode";

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const mode = useLayoutMode();
  const inRoom = pathname.startsWith("/room/");
  const tvRoom = inRoom && mode === "tv";

  return (
    <div className={`site-shell ${tvRoom ? "site-shell-tv" : ""}`}>
      {!tvRoom ? (
        <nav className="site-nav">
          <Link href="/" className="brand">
            Chorus
          </Link>
          <div className="nav-links">
            <Link href="/library">Library</Link>
            <Link href="/">Rooms</Link>
          </div>
        </nav>
      ) : null}
      {children}
    </div>
  );
}
