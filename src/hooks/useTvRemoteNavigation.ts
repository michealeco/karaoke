"use client";

import { useEffect } from "react";
import { moveTvFocus, resolveTvRemoteAction } from "@/lib/tvRemote";

/** D-pad / OK remote navigation for any screen with [data-tv-focus] controls. */
export function useTvRemoteNavigation(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    const focusFirst = () => {
      const first = document.querySelector<HTMLElement>("[data-tv-focus]");
      first?.focus();
    };
    const t = window.setTimeout(focusFirst, 200);

    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") {
        // Allow OK to leave inputs / activate nearby actions
        if (e.key !== "Enter" && e.keyCode !== 13) return;
      }

      const action = resolveTvRemoteAction(e);
      if (!action) return;

      if (action === "focus-next") {
        e.preventDefault();
        e.stopPropagation();
        moveTvFocus(1);
        return;
      }
      if (action === "focus-prev") {
        e.preventDefault();
        e.stopPropagation();
        moveTvFocus(-1);
        return;
      }
      if (action === "playpause") {
        const active = document.activeElement as HTMLElement | null;
        if (active?.matches?.("[data-tv-focus]")) {
          e.preventDefault();
          e.stopPropagation();
          active.click();
        }
      }
    }

    window.addEventListener("keydown", onKey, true);
    document.addEventListener("keydown", onKey, true);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", onKey, true);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [enabled]);
}
