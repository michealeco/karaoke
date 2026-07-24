"use client";

import { useEffect, useSyncExternalStore } from "react";

export type LayoutMode = "phone" | "tv";

const STORAGE_KEY = "chorus-device";

/** Wide landscape = TV stage; everything else = phone controller. */
export const TV_QUERY =
  "(min-width: 900px) and (min-height: 500px) and (orientation: landscape)";

export function getStoredDevice(): LayoutMode | null {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem(STORAGE_KEY);
  return v === "phone" || v === "tv" ? v : null;
}

export function setStoredDevice(mode: LayoutMode) {
  localStorage.setItem(STORAGE_KEY, mode);
}

function subscribe(onStoreChange: () => void) {
  const mql = window.matchMedia(TV_QUERY);
  mql.addEventListener("change", onStoreChange);
  window.addEventListener("orientationchange", onStoreChange);
  window.addEventListener("resize", onStoreChange);
  return () => {
    mql.removeEventListener("change", onStoreChange);
    window.removeEventListener("orientationchange", onStoreChange);
    window.removeEventListener("resize", onStoreChange);
  };
}

function getSnapshot(): LayoutMode {
  return window.matchMedia(TV_QUERY).matches ? "tv" : "phone";
}

function getServerSnapshot(): LayoutMode {
  return "phone";
}

/**
 * Viewport-driven layout (true responsive).
 * localStorage is only a home-screen hint, not a layout lock.
 */
export function useLayoutMode(): LayoutMode {
  const mode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    document.documentElement.dataset.device = mode;
  }, [mode]);

  return mode;
}
