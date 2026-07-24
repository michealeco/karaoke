import { createHmac } from "crypto";
import type { Song } from "./types";

export function isRemoteMediaEnabled() {
  return Boolean(process.env.MEDIA_API_URL);
}

function mediaApiUrl() {
  const base = process.env.MEDIA_API_URL?.replace(/\/$/, "");
  if (!base) {
    throw new Error(
      "MEDIA_API_URL is not set. Point it at your Ubuntu media server (e.g. https://media.example.com).",
    );
  }
  return base;
}

function mediaSecret() {
  const secret = process.env.MEDIA_API_SECRET;
  if (!secret) {
    throw new Error("MEDIA_API_SECRET is not set (must match the Ubuntu media server).");
  }
  return secret;
}

export function createUploadToken(ttlMs = 15 * 60 * 1000) {
  const payload = Buffer.from(
    JSON.stringify({ purpose: "upload", exp: Date.now() + ttlMs }),
  ).toString("base64url");
  const sig = createHmac("sha256", mediaSecret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function getPublicUploadUrl() {
  return `${mediaApiUrl()}/upload`;
}

function mediaHeaders(initHeaders?: HeadersInit) {
  const headers = new Headers(initHeaders);
  headers.set("x-media-secret", mediaSecret());
  // Avoid ngrok free-tier browser warning HTML on server-side fetches
  headers.set("ngrok-skip-browser-warning", "true");
  return headers;
}

async function mediaFetch(pathname: string, init: RequestInit = {}) {
  const res = await fetch(`${mediaApiUrl()}${pathname}`, {
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
      throw new Error(`Media server returned invalid JSON (${res.status})`);
    }
  }
  if (!res.ok) {
    throw new Error(String(data.error || `Media server error (${res.status})`));
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
