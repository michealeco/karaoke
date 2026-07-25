"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutMode } from "@/lib/useLayoutMode";
import { TvRemoteProvider } from "./TvRemoteProvider";

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const mode = useLayoutMode();
  const inRoom = pathname.startsWith("/room/");
  const tvRoom = inRoom && mode === "tv";

  return (
    <TvRemoteProvider>
      <div className={`site-shell ${tvRoom ? "site-shell-tv" : ""}`}>
        {!tvRoom ? (
          <nav className="site-nav">
            <Link href="/" className="brand" data-tv-focus tabIndex={0}>
              Chorus
            </Link>
            <div className="nav-links">
              <Link href="/library" data-tv-focus tabIndex={0}>
                Library
              </Link>
              <Link href="/" data-tv-focus tabIndex={0}>
                Rooms
              </Link>
            </div>
          </nav>
        ) : null}
        {children}
      </div>
    </TvRemoteProvider>
  );
}
