"use client";

import { useEffect, useState } from "react";
import type { Song } from "@/lib/types";
import { formatBytes } from "@/lib/client";
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
    const res = await fetch("/api/media/upload-token");
    return readResponseJson<UploadConfig & { error?: string }>(res);
  }

  useEffect(() => {
    loadConfig()
      .then((data) => {
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
      setError("Title and MP4 file are required.");
      return;
    }

    setBusy(true);
    setError(null);
    setProgress("Uploading…");

    try {
      const latest = await loadConfig();
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
        song = data.song;
      } else {
        const form = new FormData();
        form.set("title", title.trim());
        form.set("artist", artist.trim());
        form.set("file", file);
        const res = await fetch("/api/songs", { method: "POST", body: form });
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
          ? "Files upload directly to your Ubuntu media server."
          : "Local mode — files are saved on this machine."}
      </p>

      <div className="field-row">
        <label>
          <span>Song title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Bohemian Rhapsody"
            required
          />
        </label>
        <label>
          <span>Artist</span>
          <input
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            placeholder="Queen"
          />
        </label>
      </div>

      <label className="file-field">
        <span>Karaoke MP4</span>
        <input
          type="file"
          accept="video/mp4,.mp4"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          required
        />
        {file ? (
          <em>
            {file.name} · {formatBytes(file.size)}
          </em>
        ) : (
          <em>Drop or choose an .mp4 with burned-in lyrics</em>
        )}
      </label>

      {error ? <p className="form-error">{error}</p> : null}
      {progress ? <p className="form-progress">{progress}</p> : null}

      <button type="submit" className="btn btn-primary" disabled={busy}>
        {busy ? "Uploading…" : "Add to library"}
      </button>
    </form>
  );
}
