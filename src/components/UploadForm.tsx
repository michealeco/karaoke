"use client";

import { useEffect, useState } from "react";
import { upload } from "@vercel/blob/client";
import type { Song } from "@/lib/types";
import { formatBytes } from "@/lib/client";
import { readResponseJson } from "@/lib/http";

type Props = {
  onUploaded?: (song: Song) => void;
};

export function UploadForm({ onUploaded }: Props) {
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [blobEnabled, setBlobEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/songs")
      .then((r) => readResponseJson<{ blobEnabled?: boolean }>(r))
      .then((data) => setBlobEnabled(Boolean(data.blobEnabled)))
      .catch(() => setBlobEnabled(false));
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
      let song: Song;

      if (blobEnabled) {
        const blob = await upload(file.name, file, {
          access: "public",
          handleUploadUrl: "/api/upload",
          multipart: true,
          onUploadProgress: ({ percentage }) => {
            setProgress(`Uploading… ${Math.round(percentage)}%`);
          },
        });

        setProgress("Saving to library…");
        const res = await fetch("/api/songs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            artist: artist.trim(),
            url: blob.url,
            filename: blob.pathname,
            size: file.size,
          }),
        });
        const data = await readResponseJson<{ song?: Song; error?: string }>(res);
        if (!res.ok) throw new Error(data.error || "Failed to save song");
        if (!data.song) throw new Error("Failed to save song");
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
