"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  getStoredDevice,
  setStoredDevice,
  useLayoutMode,
  type LayoutMode,
} from "@/lib/useLayoutMode";
import { setDisplayName, setHostToken } from "@/lib/client";
import { readResponseJson } from "@/lib/http";

export function HomeActions() {
  const router = useRouter();
  const layout = useLayoutMode();
  const [device, setDevice] = useState<LayoutMode>("phone");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tvUi = layout === "tv" || device === "tv";

  useEffect(() => {
    setDevice(getStoredDevice() ?? layout);
  }, [layout]);

  function pickDevice(next: LayoutMode) {
    setDevice(next);
    setStoredDevice(next);
  }

  async function createRoom() {
    setBusy(true);
    setError(null);
    try {
      setStoredDevice(device);
      if (name.trim()) setDisplayName(name);
      const res = await fetch("/api/rooms", { method: "POST" });
      const data = await readResponseJson<{
        room: { code: string };
        hostToken: string;
        error?: string;
      }>(res);
      if (!res.ok) throw new Error(data.error || "Could not create room");
      setHostToken(data.room.code, data.hostToken);
      router.push(`/room/${data.room.code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create room");
      setBusy(false);
    }
  }

  async function joinRoom(e?: React.FormEvent) {
    e?.preventDefault();
    const cleaned = code.trim().toUpperCase();
    if (!cleaned) {
      setError("Type the room code shown on the TV, then tap Join.");
      return;
    }
    setStoredDevice(device);
    if (name.trim()) setDisplayName(name);
    setBusy(true);
    const res = await fetch(`/api/rooms/${cleaned}`);
    if (!res.ok) {
      setError("That room code was not found. Check the TV screen and try again.");
      setBusy(false);
      return;
    }
    router.push(`/room/${cleaned}`);
  }

  return (
    <div className={`home-actions ${tvUi ? "home-actions-tv" : ""}`}>
      <p className="step-label">1. What device is this?</p>
      <div className="device-picker" role="group" aria-label="What device is this?">
        <button
          type="button"
          data-tv-focus
          tabIndex={0}
          className={`device-card ${device === "phone" ? "active" : ""}`}
          onClick={() => pickDevice("phone")}
        >
          <strong>Phone</strong>
          <span>Search songs and add them to the queue</span>
        </button>
        <button
          type="button"
          data-tv-focus
          tabIndex={0}
          className={`device-card ${device === "tv" ? "active" : ""}`}
          onClick={() => pickDevice("tv")}
        >
          <strong>Smart TV</strong>
          <span>Show the big stage and play video</span>
        </button>
      </div>

      <p className="layout-hint">
        {device === "tv"
          ? "TV mode is on. Point the remote at a button and press OK, or use ↑ ↓ ← → then OK."
          : "Phone mode is on. To use a remote on a TV, choose Smart TV first."}
      </p>

      <p className="step-label">2. Your name (optional)</p>
      <label className="name-field home-name">
        <span className="sr-only">Your name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Shown next to songs you queue"
          enterKeyHint="done"
          aria-label="Your name"
        />
      </label>

      <p className="step-label">
        {device === "tv"
          ? "3. Start the party on this TV"
          : "3. Start a new room, or join one"}
      </p>
      <button
        type="button"
        data-tv-focus
        tabIndex={0}
        className="btn btn-primary btn-xl"
        onClick={createRoom}
        disabled={busy}
      >
        {busy
          ? "Opening room…"
          : device === "tv"
            ? "Start a room on this TV"
            : "Start a new room"}
      </button>

      <form
        className="join-form"
        onSubmit={(e) => {
          void joinRoom(e);
        }}
      >
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Room code from the TV"
          maxLength={6}
          aria-label="Room code from the TV"
          inputMode="text"
          autoCapitalize="characters"
          autoCorrect="off"
        />
        <button
          type="submit"
          data-tv-focus
          tabIndex={0}
          className="btn btn-ghost btn-xl"
          disabled={busy}
        >
          Join room
        </button>
      </form>

      {error ? <p className="form-error">{error}</p> : null}
    </div>
  );
}
