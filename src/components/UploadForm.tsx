"use client";

import { useEffect, useState } from "react";
import type { Song } from "@/lib/types";
import { formatBytes, libraryAdminHeaders } from "@/lib/client";
import { readResponseJson } from "@/lib/http";

type Props = {
  onUploaded?: (song: Song) => void;
};

type UploadConfig = {
  mode: "ubuntu" | "local";
  uploadUrl: string | null;
  token: string | null;
};

export function UploadForm({ onUploaded }: Props) {
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [config, setConfig] = useState<UploadConfig | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadConfig() {
    const res = await fetch("/api/media/upload-token", {
      headers: libraryAdminHeaders(),
    });
    return readResponseJson<UploadConfig & { error?: string }>(res);
  }

  useEffect(() => {
    loadConfig()
      .then((data) => {
        if (data.error) {
          setError(data.error);
          setConfig({ mode: "local", uploadUrl: null, token: null });
          return;
        }
        setConfig({
          mode: data.mode === "ubuntu" ? "ubuntu" : "local",
          uploadUrl: data.uploadUrl,
          token: data.token,
        });
      })
      .catch(() => setConfig({ mode: "local", uploadUrl: null, token: null }));
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !title.trim()) {
      setError("Enter a song title and choose an .mp4 file, then try again.");
      return;
    }

    setBusy(true);
    setError(null);
    setProgress("Uploading…");

    try {
      const latest = await loadConfig();
      if (latest.error) throw new Error(latest.error);
      let song: Song;

      if (latest.mode === "ubuntu" && latest.uploadUrl && latest.token) {
        const form = new FormData();
        form.set("title", title.trim());
        form.set("artist", artist.trim());
        form.set("file", file);

        const res = await fetch(latest.uploadUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${latest.token}`,
            "ngrok-skip-browser-warning": "true",
          },
          body: form,
        });
        const data = await readResponseJson<{ song?: Song; error?: string }>(res);
        if (!res.ok) throw new Error(data.error || "Upload to Ubuntu failed");
        if (!data.song) throw new Error("Upload to Ubuntu failed");
        song = {
          ...data.song,
          url: `/api/stream?f=${encodeURIComponent(data.song.filename)}`,
        };
      } else {
        const form = new FormData();
        form.set("title", title.trim());
        form.set("artist", artist.trim());
        form.set("file", file);
        const res = await fetch("/api/songs", {
          method: "POST",
          headers: libraryAdminHeaders(),
          body: form,
        });
        const data = await readResponseJson<{ song?: Song; error?: string }>(res);
        if (!res.ok) throw new Error(data.error || "Upload failed");
        if (!data.song) throw new Error("Upload failed");
        song = data.song;
      }

      setTitle("");
      setArtist("");
      setFile(null);
      setProgress(null);
      onUploaded?.(song);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setProgress(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="upload-form">
      <p className="panel-copy">
        {config?.mode === "ubuntu"
          ? "Uploads go to your media server so every room can play them."
          : "Dev mode: files stay on this computer until you connect a media server."}
      </p>

      <div className="field-row">
        <label>
          <span>Song title (required)</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Bohemian Rhapsody"
            required
          />
        </label>
        <label>
          <span>Artist (optional)</span>
          <input
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            placeholder="e.g. Queen"
          />
        </label>
      </div>

      <label className="file-field">
        <span>Karaoke MP4 file</span>
        <input
          type="file"
          accept="video/mp4,.mp4"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          required
        />
        {file ? (
          <em>
            Ready: {file.name} · {formatBytes(file.size)}
          </em>
        ) : (
          <em>Choose an .mp4 that already has lyrics on screen</em>
        )}
      </label>

      {error ? <p className="form-error">{error}</p> : null}
      {progress ? <p className="form-progress">{progress}</p> : null}

      <button type="submit" className="btn btn-primary" disabled={busy}>
        {busy ? "Uploading… please wait" : "Add to library"}
      </button>
    </form>
  );
}
