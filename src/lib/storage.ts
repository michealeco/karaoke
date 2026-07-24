import { mkdir, readFile, writeFile, unlink, access } from "fs/promises";
import path from "path";
import { put, list, del } from "@vercel/blob";

const DATA_DIR = path.join(process.cwd(), "data");
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

function useBlob() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

async function ensureLocalDirs() {
  await mkdir(DATA_DIR, { recursive: true });
  await mkdir(UPLOAD_DIR, { recursive: true });
  await mkdir(path.join(DATA_DIR, "rooms"), { recursive: true });
}

export async function readJson<T>(key: string, fallback: T): Promise<T> {
  if (useBlob()) {
    const { blobs } = await list({ prefix: `meta/${key}` });
    const match = blobs.find((b) => b.pathname === `meta/${key}`);
    if (!match) return fallback;
    const res = await fetch(match.url, { cache: "no-store" });
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  }

  await ensureLocalDirs();
  const filePath = path.join(DATA_DIR, key);
  try {
    await access(filePath);
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function writeJson(key: string, value: unknown): Promise<void> {
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

export function isBlobEnabled() {
  return useBlob();
}
