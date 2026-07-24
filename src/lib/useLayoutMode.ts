"use client";

import { useEffect, useState } from "react";

export type LayoutMode = "phone" | "tv";

const STORAGE_KEY = "chorus-device";
const TV_QUERY = "(min-width: 1024px) and (min-height: 640px) and (orientation: landscape)";

export function getStoredDevice(): LayoutMode | null {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem(STORAGE_KEY);
  return v === "phone" || v === "tv" ? v : null;
}

export function setStoredDevice(mode: LayoutMode) {
  localStorage.setItem(STORAGE_KEY, mode);
}

function detectDevice(): LayoutMode {
  if (typeof window === "undefined") return "phone";
  const forced = getStoredDevice();
  if (forced) return forced;
  return window.matchMedia(TV_QUERY).matches ? "tv" : "phone";
}

/** Phone vs TV layout. Optional force overrides storage + media query. */
export function useLayoutMode(force?: LayoutMode | null): LayoutMode {
  const [mode, setMode] = useState<LayoutMode>("phone");

  useEffect(() => {
    if (force === "phone" || force === "tv") {
      setMode(force);
      document.documentElement.dataset.device = force;
      return;
    }

    const apply = () => {
      const next = detectDevice();
      setMode(next);
      document.documentElement.dataset.device = next;
    };

    apply();
    const mql = window.matchMedia(TV_QUERY);
    const onChange = () => apply();
    mql.addEventListener("change", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      mql.removeEventListener("change", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, [force]);

  return mode;
}
