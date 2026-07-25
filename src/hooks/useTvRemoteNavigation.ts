"use client";

import { useEffect } from "react";
import {
  activateTvTarget,
  moveTvFocusDirectional,
  resolveTvRemoteAction,
  trackPointerPosition,
} from "@/lib/tvRemote";

/**
 * TV remotes today usually move a cursor; OK clicks.
 * D-pad remotes move focus; OK activates the focused control.
 */
export function useTvRemoteNavigation(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    const onMove = (e: MouseEvent) => trackPointerPosition(e);
    const onPointer = (e: PointerEvent) => trackPointerPosition(e);

    window.addEventListener("mousemove", onMove, true);
    window.addEventListener("pointermove", onPointer, true);

    const focusFirst = () => {
      const first = document.querySelector<HTMLElement>("[data-tv-focus]");
      first?.focus();
    };
    const t = window.setTimeout(focusFirst, 250);

    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName;
      const inField = tag === "INPUT" || tag === "TEXTAREA";

      const action = resolveTvRemoteAction(e);
      if (!action) return;

      if (inField && action !== "ok" && action !== "back") return;

      if (action === "focus-left") {
        e.preventDefault();
        e.stopPropagation();
        moveTvFocusDirectional("left");
        return;
      }
      if (action === "focus-right") {
        e.preventDefault();
        e.stopPropagation();
        moveTvFocusDirectional("right");
        return;
      }
      if (action === "focus-up") {
        e.preventDefault();
        e.stopPropagation();
        if (inField) (e.target as HTMLElement).blur();
        moveTvFocusDirectional("up");
        return;
      }
      if (action === "focus-down") {
        e.preventDefault();
        e.stopPropagation();
        if (inField) (e.target as HTMLElement).blur();
        moveTvFocusDirectional("down");
        return;
      }
      if (action === "ok") {
        e.preventDefault();
        e.stopPropagation();
        if (!activateTvTarget() && inField) {
          // fall through — allow form submit if any
          (e.target as HTMLElement).blur();
        }
        return;
      }
      if (action === "back") {
        // Let the TV browser handle Back/Home unless we add app history later
        return;
      }
    }

    window.addEventListener("keydown", onKey, true);
    document.addEventListener("keydown", onKey, true);

    return () => {
      window.clearTimeout(t);
      window.removeEventListener("mousemove", onMove, true);
      window.removeEventListener("pointermove", onPointer, true);
      window.removeEventListener("keydown", onKey, true);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [enabled]);
}
