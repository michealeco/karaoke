import type { Song } from "./types";
import { isRemoteMediaEnabled } from "./media";

/**
 * Browsers play video from this app URL, not ngrok.
 * Free ngrok shows an interstitial HTML page to browsers that can't send
 * `ngrok-skip-browser-warning`, so remote TVs/phones fail on direct ngrok URLs.
 */
export function toClientSong(song: Song): Song {
  if (!isRemoteMediaEnabled() || !song.filename) return song;
  return {
    ...song,
    url: `/api/stream/${encodeURIComponent(song.filename)}`,
  };
}

export function toClientSongs(songs: Song[]): Song[] {
  return songs.map(toClientSong);
}
