import { customAlphabet } from "nanoid";
import type { Song } from "./types";
import { deleteLocalUpload, isBlobEnabled, readJson, writeJson } from "./storage";
import { del } from "@vercel/blob";

const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 12);

const SONGS_KEY = "songs.json";

export async function listSongs(): Promise<Song[]> {
  const songs = await readJson<Song[]>(SONGS_KEY, []);
  return songs.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getSong(id: string): Promise<Song | null> {
  const songs = await listSongs();
  return songs.find((s) => s.id === id) ?? null;
}

export async function searchSongs(query: string): Promise<Song[]> {
  const q = query.trim().toLowerCase();
  const songs = await listSongs();
  if (!q) return songs;
  return songs.filter(
    (s) =>
      s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q),
  );
}

export async function addSong(
  input: Omit<Song, "id" | "createdAt">,
): Promise<Song> {
  const songs = await listSongs();
  const song: Song = {
    ...input,
    id: nanoid(),
    createdAt: Date.now(),
  };
  songs.unshift(song);
  await writeJson(SONGS_KEY, songs);
  return song;
}

export async function removeSong(id: string): Promise<boolean> {
  const songs = await listSongs();
  const song = songs.find((s) => s.id === id);
  if (!song) return false;

  const next = songs.filter((s) => s.id !== id);
  await writeJson(SONGS_KEY, next);

  if (isBlobEnabled() && song.url.startsWith("http")) {
    try {
      await del(song.url);
    } catch {
      // blob may already be gone
    }
  } else if (song.filename) {
    await deleteLocalUpload(song.filename);
  }

  return true;
}
