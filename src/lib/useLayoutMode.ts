"use client";

import { useEffect, useSyncExternalStore } from "react";

export type LayoutMode = "phone" | "tv";

const STORAGE_KEY = "chorus-device";
const CHANGE_EVENT = "chorus-device-change";

/** Lenient TV detection — many TV browsers report odd sizes. */
export const TV_QUERY = "(min-width: 800px)";

export function getStoredDevice(): LayoutMode | null {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem(STORAGE_KEY);
  return v === "phone" || v === "tv" ? v : null;
}

export function setStoredDevice(mode: LayoutMode) {
  localStorage.setItem(STORAGE_KEY, mode);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }
}

export function isSmartTvUserAgent() {
  if (typeof navigator === "undefined") return false;
  return /SmartTV|SMART-TV|SmartTv|Tizen|WebOS|Web0S|NETCAST|BRAVIA|AppleTV|Android TV|GoogleTV|HbbTV|Viera|PhilipsTV|CrKey|TV Safari|Silk/i.test(
    navigator.userAgent,
  );
}

function detectMode(): LayoutMode {
  const stored = getStoredDevice();
  if (stored) return stored;
  if (isSmartTvUserAgent()) return "tv";
  if (window.matchMedia(TV_QUERY).matches) return "tv";
  // Large screens even in "portrait" CSS on some TVs
  if (Math.min(window.innerWidth, window.innerHeight) >= 700) return "tv";
  return "phone";
}

function subscribe(onStoreChange: () => void) {
  const mql = window.matchMedia(TV_QUERY);
  mql.addEventListener("change", onStoreChange);
  window.addEventListener("orientationchange", onStoreChange);
  window.addEventListener("resize", onStoreChange);
  window.addEventListener(CHANGE_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    mql.removeEventListener("change", onStoreChange);
    window.removeEventListener("orientationchange", onStoreChange);
    window.removeEventListener("resize", onStoreChange);
    window.removeEventListener(CHANGE_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function getServerSnapshot(): LayoutMode {
  return "phone";
}

/** Prefer: saved choice → smart TV UA → wide screen → phone */
export function useLayoutMode(): LayoutMode {
  const mode = useSyncExternalStore(subscribe, detectMode, getServerSnapshot);

  useEffect(() => {
    document.documentElement.dataset.device = mode;
    // First visit on a TV: remember TV so remotes keep working
    if (!getStoredDevice() && (isSmartTvUserAgent() || mode === "tv")) {
      setStoredDevice("tv");
    }
  }, [mode]);

  return mode;
}
