import { customAlphabet } from "nanoid";
import type { Song } from "./types";
import {
  isRemoteMediaEnabled,
  remoteListSongs,
  remoteRemoveSong,
} from "./media";
import { deleteLocalUpload, readJson, writeJson } from "./storage";

const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 12);
const SONGS_KEY = "songs.json";

export async function listSongs(): Promise<Song[]> {
  if (isRemoteMediaEnabled()) {
    return remoteListSongs();
  }
  const songs = await readJson<Song[]>(SONGS_KEY, []);
  return songs.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getSong(id: string): Promise<Song | null> {
  const songs = await listSongs();
  return songs.find((s) => s.id === id) ?? null;
}

export async function searchSongs(query: string): Promise<Song[]> {
  if (isRemoteMediaEnabled()) {
    return remoteListSongs(query);
  }
  const q = query.trim().toLowerCase();
  const songs = await listSongs();
  if (!q) return songs;
  return songs.filter(
    (s) =>
      s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q),
  );
}

/** Local/dev only — remote uploads go straight to the Ubuntu media server. */
export async function addSong(
  input: Omit<Song, "id" | "createdAt">,
): Promise<Song> {
  if (isRemoteMediaEnabled()) {
    throw new Error(
      "Songs are hosted on your Ubuntu media server. Upload from the Library page (direct to Ubuntu).",
    );
  }

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
  if (isRemoteMediaEnabled()) {
    return remoteRemoveSong(id);
  }

  const songs = await listSongs();
  const song = songs.find((s) => s.id === id);
  if (!song) return false;

  const next = songs.filter((s) => s.id !== id);
  await writeJson(SONGS_KEY, next);

  if (song.filename) {
    await deleteLocalUpload(song.filename);
  }

  return true;
}

export function songsStorageMode(): "ubuntu" | "local" {
  return isRemoteMediaEnabled() ? "ubuntu" : "local";
}
