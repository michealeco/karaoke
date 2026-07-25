"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Song } from "@/lib/types";
import { formatBytes } from "@/lib/client";
import { readResponseJson } from "@/lib/http";
import { UploadForm } from "./UploadForm";

type Props = {
  selectable?: boolean;
  onSelect?: (song: Song) => void;
  compact?: boolean;
};

export function SongLibrary({ selectable, onSelect, compact }: Props) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (q = "") => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/songs?q=${encodeURIComponent(q)}`);
      const data = await readResponseJson<{
        songs?: Song[];
        error?: string;
      }>(res);
      if (!res.ok) throw new Error(data.error || "Failed to load songs");
      setSongs(data.songs ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(query), 200);
    return () => clearTimeout(t);
  }, [query, load]);

  const empty = useMemo(
    () => !loading && songs.length === 0,
    [loading, songs.length],
  );

  async function removeSong(id: string) {
    if (!confirm("Remove this song from the library?")) return;
    const res = await fetch(`/api/songs/${id}`, { method: "DELETE" });
    if (res.ok) setSongs((prev) => prev.filter((s) => s.id !== id));
  }

  return (
    <div className={`library ${compact ? "library-compact" : ""}`}>
      {!compact ? (
        <section className="panel">
          <h2>1. Upload a karaoke video</h2>
          <p className="panel-copy">
            Use an MP4 that already shows lyrics on the video. Fill in the title,
            pick the file, then tap Add to library.
          </p>
          <UploadForm onUploaded={(song) => setSongs((prev) => [song, ...prev])} />
        </section>
      ) : null}

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>{compact ? "2. Pick a song to queue" : "2. Your uploaded songs"}</h2>
            <p className="panel-copy">
              {compact
                ? "Search, then tap Add to queue so it plays on the TV."
                : "Search by title or artist. Remove songs you no longer need."}
            </p>
          </div>
          <input
            className="search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a title or artist…"
            aria-label="Search songs by title or artist"
          />
        </div>

        {error ? <p className="form-error">{error}</p> : null}
        {loading ? <p className="muted">Loading songs…</p> : null}
        {empty ? (
          <p className="muted">
            {compact
              ? "No songs yet. Ask the host to upload MP4s in Library first."
              : "No songs yet. Upload an MP4 above, then start a room."}
          </p>
        ) : null}

        <ul className="song-list">
          {songs.map((song) => (
            <li key={song.id} className="song-row">
              <div>
                <strong>{song.title}</strong>
                <span>{song.artist}</span>
                <em>{formatBytes(song.size)}</em>
              </div>
              <div className="song-actions">
                {selectable ? (
                  <button
                    type="button"
                    className="btn btn-small"
                    onClick={() => onSelect?.(song)}
                  >
                    Add to queue
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-ghost btn-small"
                    onClick={() => removeSong(song.id)}
                  >
                    Remove
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
