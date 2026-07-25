"use client";

import { useEffect } from "react";
import {
  activateTvTarget,
  moveTvFocusDirectional,
  resolveTvRemoteAction,
  trackPointerPosition,
} from "@/lib/tvRemote";

function isFocusableControl(el: Element) {
  if (!(el instanceof HTMLElement)) return false;
  if (el.closest("[data-tv-skip]")) return false;
  const tag = el.tagName;
  if (tag === "BUTTON") return true;
  if (tag === "A" && el.hasAttribute("href")) return true;
  if (el.getAttribute("role") === "button") return true;
  if (tag === "INPUT") {
    const type = (el as HTMLInputElement).type;
    return type === "button" || type === "submit" || type === "file" || type === "checkbox";
  }
  if (el.classList.contains("btn") || el.classList.contains("device-card")) return true;
  return el.hasAttribute("data-tv-focus");
}

function tagControls(root: ParentNode = document) {
  root.querySelectorAll("button, a[href], [role='button'], input, .btn, .device-card").forEach((node) => {
    if (!isFocusableControl(node)) return;
    const el = node as HTMLElement;
    if (!el.hasAttribute("data-tv-focus")) el.setAttribute("data-tv-focus", "");
    if (!el.hasAttribute("tabindex")) el.tabIndex = 0;
  });
}

/**
 * App-wide smart TV remote support:
 * - Cursor remotes: point + OK clicks control under cursor
 * - D-pad: ↑↓←→ move between buttons, OK activates
 * - Auto-tags buttons/links so every screen works
 */
export function TvRemoteProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    tagControls();
    const mo = new MutationObserver(() => tagControls());
    mo.observe(document.body, { childList: true, subtree: true });

    const onMove = (e: MouseEvent) => trackPointerPosition(e);
    window.addEventListener("mousemove", onMove, true);
    window.addEventListener("pointermove", onMove as EventListener, true);

    const focusFirst = () => {
      const active = document.activeElement;
      if (active && active !== document.body && active !== document.documentElement) return;
      document.querySelector<HTMLElement>("[data-tv-focus]")?.focus();
    };
    const t = window.setTimeout(focusFirst, 300);

    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const inTextField =
        tag === "TEXTAREA" ||
        (tag === "INPUT" &&
          !["button", "submit", "file", "checkbox", "radio"].includes(
            (target as HTMLInputElement).type,
          ));

      const action = resolveTvRemoteAction(e);
      if (!action) return;

      // Media keys → room host controls (RoomClient listens)
      if (
        action === "play" ||
        action === "pause" ||
        action === "next" ||
        action === "prev"
      ) {
        window.dispatchEvent(
          new CustomEvent("chorus-tv-media", { detail: { action } }),
        );
        return;
      }

      if (inTextField && action !== "ok" && action !== "back" && !action.startsWith("focus-")) {
        return;
      }

      if (action === "back") {
        // In text fields, let Backspace edit; otherwise go back in history
        if (!inTextField && window.history.length > 1) {
          e.preventDefault();
          window.history.back();
        }
        return;
      }

      if (action.startsWith("focus-")) {
        e.preventDefault();
        e.stopPropagation();
        if (inTextField) target?.blur();
        const dir = action.replace("focus-", "") as
          | "left"
          | "right"
          | "up"
          | "down";
        moveTvFocusDirectional(dir);
        return;
      }

      if (action === "ok") {
        e.preventDefault();
        e.stopPropagation();
        if (inTextField) {
          target?.blur();
          // after blur, try activate under cursor / next control
        }
        if (!activateTvTarget()) {
          document.querySelector<HTMLElement>("[data-tv-focus]")?.focus();
        }
      }
    }

    // Also treat click/pointer as tracking for cursor remotes
    function onPointerDown(e: PointerEvent) {
      trackPointerPosition(e);
    }

    window.addEventListener("keydown", onKey, true);
    document.addEventListener("keydown", onKey, true);
    window.addEventListener("pointerdown", onPointerDown, true);

    return () => {
      mo.disconnect();
      window.clearTimeout(t);
      window.removeEventListener("mousemove", onMove, true);
      window.removeEventListener("pointermove", onMove as EventListener, true);
      window.removeEventListener("keydown", onKey, true);
      document.removeEventListener("keydown", onKey, true);
      window.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, []);

  return children;
}
