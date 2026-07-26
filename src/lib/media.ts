import { createHmac } from "crypto";
import type { Song } from "./types";

export function isRemoteMediaEnabled() {
  return Boolean(process.env.MEDIA_API_URL && process.env.MEDIA_API_SECRET);
}

export function mediaApiUrl() {
  const base = process.env.MEDIA_API_URL?.replace(/\/$/, "");
  if (!base) {
    throw new Error(
      "MEDIA_API_URL is not set. Point it at your Ubuntu media server (ngrok HTTPS URL).",
    );
  }
  return base;
}

function mediaSecret() {
  const secret = process.env.MEDIA_API_SECRET;
  if (!secret) {
    throw new Error(
      "MEDIA_API_SECRET is not set (must match the Ubuntu media server .env).",
    );
  }
  return secret;
}

export function createUploadToken(ttlMs = 15 * 60 * 1000) {
  const payload = Buffer.from(
    JSON.stringify({ purpose: "upload", exp: Date.now() + ttlMs }),
  ).toString("base64url");
  const sig = createHmac("sha256", mediaSecret())
    .update(payload)
    .digest("base64url");
  return `${payload}.${sig}`;
}

export function getPublicUploadUrl() {
  return `${mediaApiUrl()}/upload`;
}

function mediaHeaders(initHeaders?: HeadersInit) {
  const headers = new Headers(initHeaders);
  headers.set("x-media-secret", mediaSecret());
  headers.set("ngrok-skip-browser-warning", "true");
  return headers;
}

export async function mediaFetch(pathname: string, init: RequestInit = {}) {
  const url = `${mediaApiUrl()}${pathname}`;
  const res = await fetch(url, {
    ...init,
    headers: mediaHeaders(init.headers),
    cache: "no-store",
  });
  const text = await res.text();
  let data: Record<string, unknown> = {};
  if (text.trim()) {
    try {
      data = JSON.parse(text) as Record<string, unknown>;
    } catch {
      const snippet = text.replace(/\s+/g, " ").slice(0, 120);
      throw new Error(
        `Media server at ${url} returned non-JSON (${res.status}): ${snippet || "(empty)"}`,
      );
    }
  }
  if (!res.ok) {
    throw new Error(String(data.error || `Media server error (${res.status}) at ${pathname}`));
  }
  return data;
}

export async function remoteListSongs(query = ""): Promise<Song[]> {
  const q = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : "";
  const data = await mediaFetch(`/library${q}`);
  return (data.songs as Song[]) || [];
}

export async function remoteRemoveSong(id: string): Promise<boolean> {
  try {
    await mediaFetch(`/songs/${encodeURIComponent(id)}`, { method: "DELETE" });
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("404") || message.toLowerCase().includes("not found")) {
      return false;
    }
    throw error;
  }
}

export async function remoteReadJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(
      `${mediaApiUrl()}/kv?key=${encodeURIComponent(key)}`,
      {
        headers: mediaHeaders(),
        cache: "no-store",
      },
    );
    if (res.status === 404) return fallback;
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`Media kv read failed (${res.status})`);
    }
    if (!text.trim()) return fallback;
    try {
      return JSON.parse(text) as T;
    } catch {
      return fallback;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("404") || message.toLowerCase().includes("not found")) {
      return fallback;
    }
    throw error;
  }
}

export async function remoteWriteJson(key: string, value: unknown): Promise<void> {
  await mediaFetch("/kv", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, value }),
  });
}

export async function remoteDeleteJson(key: string): Promise<void> {
  await mediaFetch(`/kv?key=${encodeURIComponent(key)}`, { method: "DELETE" });
}
