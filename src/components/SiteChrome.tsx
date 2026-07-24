"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

function ChromeInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tvMode =
    pathname.startsWith("/room/") && searchParams.get("tv") === "1";

  useEffect(() => {
    document.documentElement.classList.toggle("tv-mode", tvMode);
    document.body.classList.toggle("tv-mode", tvMode);
    return () => {
      document.documentElement.classList.remove("tv-mode");
      document.body.classList.remove("tv-mode");
    };
  }, [tvMode]);

  return (
    <div className={`site-shell ${tvMode ? "site-shell-tv" : ""}`}>
      {!tvMode ? (
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

export function SiteChrome({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="site-shell">{children}</div>}>
      <ChromeInner>{children}</ChromeInner>
    </Suspense>
  );
}
