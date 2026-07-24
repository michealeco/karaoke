import { mkdir, readFile, writeFile, unlink, access } from "fs/promises";
import path from "path";
import { put, list, del } from "@vercel/blob";
import {
  isRemoteMediaEnabled,
  remoteDeleteJson,
  remoteReadJson,
  remoteWriteJson,
} from "./media";

const DATA_DIR = path.join(process.cwd(), "data");
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

function useBlob() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export function isBlobEnabled() {
  return useBlob();
}

function requireStorage() {
  // Prefer Ubuntu media server. Blob is optional fallback only.
  if (process.env.VERCEL && !isRemoteMediaEnabled() && !useBlob()) {
    throw new Error(
      "Ubuntu storage is not configured. Set MEDIA_API_URL and MEDIA_API_SECRET on Vercel to your ngrok/media-server URL, then redeploy.",
    );
  }
}

async function ensureLocalDirs() {
  await mkdir(DATA_DIR, { recursive: true });
  await mkdir(UPLOAD_DIR, { recursive: true });
  await mkdir(path.join(DATA_DIR, "rooms"), { recursive: true });
}

async function parseJsonText<T>(raw: string, fallback: T): Promise<T> {
  const trimmed = raw.trim();
  if (!trimmed) return fallback;
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    return fallback;
  }
}

export async function readJson<T>(key: string, fallback: T): Promise<T> {
  requireStorage();

  if (isRemoteMediaEnabled()) {
    return remoteReadJson(key, fallback);
  }

  if (useBlob()) {
    try {
      const { blobs } = await list({ prefix: `meta/${key}` });
      const match = blobs.find((b) => b.pathname === `meta/${key}`);
      if (!match) return fallback;
      const res = await fetch(match.url, { cache: "no-store" });
      if (!res.ok) return fallback;
      return parseJsonText(await res.text(), fallback);
    } catch (error) {
      console.error("readJson blob failed", key, error);
      return fallback;
    }
  }

  await ensureLocalDirs();
  const filePath = path.join(DATA_DIR, key);
  try {
    await access(filePath);
    const raw = await readFile(filePath, "utf8");
    return parseJsonText(raw, fallback);
  } catch {
    return fallback;
  }
}

export async function writeJson(key: string, value: unknown): Promise<void> {
  requireStorage();

  if (isRemoteMediaEnabled()) {
    await remoteWriteJson(key, value);
    return;
  }

  const body = JSON.stringify(value, null, 2);

  if (useBlob()) {
    await put(`meta/${key}`, body, {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
    });
    return;
  }

  await ensureLocalDirs();
  const filePath = path.join(DATA_DIR, key);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, body, "utf8");
}

export async function deleteJson(key: string): Promise<void> {
  requireStorage();

  if (isRemoteMediaEnabled()) {
    await remoteDeleteJson(key);
    return;
  }

  if (useBlob()) {
    const { blobs } = await list({ prefix: `meta/${key}` });
    const match = blobs.find((b) => b.pathname === `meta/${key}`);
    if (match) await del(match.url);
    return;
  }

  const filePath = path.join(DATA_DIR, key);
  try {
    await unlink(filePath);
  } catch {
    // ignore missing
  }
}

export async function saveLocalUpload(
  filename: string,
  bytes: Buffer,
): Promise<{ url: string; filename: string }> {
  if (process.env.VERCEL) {
    throw new Error(
      "Local uploads are not available on Vercel. Songs upload to your Ubuntu media server.",
    );
  }

  await ensureLocalDirs();
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const unique = `${Date.now()}-${safe}`;
  const filePath = path.join(UPLOAD_DIR, unique);
  await writeFile(filePath, bytes);
  return { url: `/uploads/${unique}`, filename: unique };
}

export async function deleteLocalUpload(filename: string): Promise<void> {
  const filePath = path.join(UPLOAD_DIR, filename);
  try {
    await unlink(filePath);
  } catch {
    // ignore
  }
}
