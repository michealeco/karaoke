"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { setDisplayName, setHostToken } from "@/lib/client";

export function HomeActions() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createRoom(tv: boolean) {
    setBusy(true);
    setError(null);
    try {
      if (name.trim()) setDisplayName(name);
      const res = await fetch("/api/rooms", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create room");
      setHostToken(data.room.code, data.hostToken);
      router.push(
        tv ? `/room/${data.room.code}?tv=1` : `/room/${data.room.code}`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create room");
      setBusy(false);
    }
  }

  async function joinRoom(e: React.FormEvent, tv = false) {
    e.preventDefault();
    const cleaned = code.trim().toUpperCase();
    if (!cleaned) return;
    if (name.trim()) setDisplayName(name);
    setBusy(true);
    const res = await fetch(`/api/rooms/${cleaned}`);
    if (!res.ok) {
      setError("Room not found. Check the code and try again.");
      setBusy(false);
      return;
    }
    router.push(tv ? `/room/${cleaned}?tv=1` : `/room/${cleaned}`);
  }

  return (
    <div className="home-actions">
      <label className="name-field home-name">
        <span>Your name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Optional"
        />
      </label>

      <div className="cta-row">
        <button
          type="button"
          className="btn btn-primary btn-large"
          onClick={() => createRoom(false)}
          disabled={busy}
        >
          {busy ? "Opening…" : "Start a room"}
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-large"
          onClick={() => createRoom(true)}
          disabled={busy}
        >
          Start on TV
        </button>
      </div>

      <form className="join-form" onSubmit={(e) => joinRoom(e, false)}>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Room code"
          maxLength={6}
          aria-label="Room code"
        />
        <button type="submit" className="btn btn-ghost btn-large" disabled={busy}>
          Join
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-large"
          disabled={busy || !code.trim()}
          onClick={(e) => joinRoom(e, true)}
        >
          Open on TV
        </button>
      </form>

      {error ? <p className="form-error">{error}</p> : null}
    </div>
  );
}
