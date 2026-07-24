"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Song } from "@/lib/types";
import { formatBytes } from "@/lib/client";
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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load songs");
      setSongs(data.songs);
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
          <h2>Upload a track</h2>
          <p className="panel-copy">
            Add karaoke MP4s with lyrics already on the video.
          </p>
          <UploadForm onUploaded={(song) => setSongs((prev) => [song, ...prev])} />
        </section>
      ) : null}

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>{compact ? "Add from library" : "Library"}</h2>
            <p className="panel-copy">Search by title or artist.</p>
          </div>
          <input
            className="search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search songs…"
          />
        </div>

        {error ? <p className="form-error">{error}</p> : null}
        {loading ? <p className="muted">Loading…</p> : null}
        {empty ? (
          <p className="muted">
            No songs yet. Upload an MP4 to get the party started.
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
