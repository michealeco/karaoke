"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Song } from "@/lib/types";
import {
  clearLibraryAdminPassword,
  formatBytes,
  getLibraryAdminPassword,
  libraryAdminHeaders,
  setLibraryAdminPassword,
} from "@/lib/client";
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
  const [isOwner, setIsOwner] = useState(false);
  const [ownerPassword, setOwnerPassword] = useState("");
  const [unlockBusy, setUnlockBusy] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);

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
    setIsOwner(Boolean(getLibraryAdminPassword()));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(query), 200);
    return () => clearTimeout(t);
  }, [query, load]);

  const empty = useMemo(
    () => !loading && songs.length === 0,
    [loading, songs.length],
  );

  async function unlockOwner(e: React.FormEvent) {
    e.preventDefault();
    setUnlockBusy(true);
    setUnlockError(null);
    try {
      const res = await fetch("/api/library/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: ownerPassword }),
      });
      const data = await readResponseJson<{ ok?: boolean; error?: string }>(res);
      if (!res.ok) throw new Error(data.error || "Wrong password");
      setLibraryAdminPassword(ownerPassword.trim());
      setIsOwner(true);
      setOwnerPassword("");
    } catch (err) {
      setUnlockError(err instanceof Error ? err.message : "Could not unlock");
    } finally {
      setUnlockBusy(false);
    }
  }

  function lockOwner() {
    clearLibraryAdminPassword();
    setIsOwner(false);
  }

  async function removeSong(id: string) {
    if (!confirm("Remove this song from the library?")) return;
    const res = await fetch(`/api/songs/${id}`, {
      method: "DELETE",
      headers: libraryAdminHeaders(),
    });
    const data = await readResponseJson<{ error?: string }>(res);
    if (!res.ok) {
      setError(data.error || "Could not remove song");
      return;
    }
    setSongs((prev) => prev.filter((s) => s.id !== id));
  }

  return (
    <div className={`library ${compact ? "library-compact" : ""}`}>
      {!compact ? (
        isOwner ? (
          <section className="panel">
            <div className="panel-head owner-head">
              <div>
                <h2>1. Upload a karaoke video</h2>
                <p className="panel-copy">
                  Owner mode is on. Guests can browse songs but cannot upload.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-small"
                onClick={lockOwner}
              >
                Lock uploads
              </button>
            </div>
            <UploadForm
              onUploaded={(song) => setSongs((prev) => [song, ...prev])}
            />
          </section>
        ) : (
          <section className="panel">
            <h2>Browse only</h2>
            <p className="panel-copy">
              Everyone can search and queue songs in a room. Only the library
              owner can upload or remove files.
            </p>
            <form className="owner-unlock" onSubmit={unlockOwner}>
              <label>
                <span>Owner password</span>
                <input
                  type="password"
                  value={ownerPassword}
                  onChange={(e) => setOwnerPassword(e.target.value)}
                  placeholder="Enter to unlock uploads"
                  autoComplete="current-password"
                />
              </label>
              <button
                type="submit"
                className="btn btn-ghost"
                disabled={unlockBusy || !ownerPassword.trim()}
              >
                {unlockBusy ? "Checking…" : "Unlock uploads"}
              </button>
            </form>
            {unlockError ? <p className="form-error">{unlockError}</p> : null}
          </section>
        )
      ) : null}

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>
              {compact
                ? "Pick a song to queue"
                : isOwner
                  ? "2. Your uploaded songs"
                  : "Song list"}
            </h2>
            <p className="panel-copy">
              {compact
                ? "Search, then tap Add to queue so it plays on the TV."
                : isOwner
                  ? "Search by title or artist. Remove songs you no longer need."
                  : "Search by title or artist. Join a room to add songs to the queue."}
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
              ? "No songs yet. Ask the owner to upload MP4s in Library first."
              : isOwner
                ? "No songs yet. Upload an MP4 above, then start a room."
                : "No songs yet. The owner needs to unlock and upload MP4s."}
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
                ) : isOwner ? (
                  <button
                    type="button"
                    className="btn btn-ghost btn-small"
                    onClick={() => removeSong(song.id)}
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
