import type { Song } from "./types";
import { isRemoteMediaEnabled } from "./media";

/** Build the in-app stream URL for a karaoke file. */
export function streamUrlForFilename(filename: string) {
  return `/api/stream?f=${encodeURIComponent(filename)}`;
}

/**
 * Prefer streaming via this app (Vercel), never raw ngrok in the browser.
 * Free ngrok serves an HTML interstitial to phone/TV browsers → broken video.
 */
export function playableSongUrl(song: Pick<Song, "url" | "filename"> | null | undefined) {
  if (!song) return null;
  if (song.filename) return streamUrlForFilename(song.filename);

  const match = song.url?.match(/\/media\/([^/?#]+)/);
  if (match?.[1]) {
    return streamUrlForFilename(decodeURIComponent(match[1]));
  }
  return song.url || null;
}

export function toClientSong(song: Song): Song {
  if (!isRemoteMediaEnabled() || !song.filename) return song;
  return {
    ...song,
    url: streamUrlForFilename(song.filename),
  };
}

export function toClientSongs(songs: Song[]): Song[] {
  return songs.map(toClientSong);
}
