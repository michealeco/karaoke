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
  const viewport = useLayoutMode();
  const [device, setDevice] = useState<LayoutMode>("phone");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDevice(getStoredDevice() ?? viewport);
  }, [viewport]);

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

  async function joinRoom(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = code.trim().toUpperCase();
    if (!cleaned) return;
    setStoredDevice(device);
    if (name.trim()) setDisplayName(name);
    setBusy(true);
    const res = await fetch(`/api/rooms/${cleaned}`);
    if (!res.ok) {
      setError("Room not found. Check the code and try again.");
      setBusy(false);
      return;
    }
    router.push(`/room/${cleaned}`);
  }

  return (
    <div className="home-actions">
      <div className="device-picker" role="group" aria-label="This device">
        <button
          type="button"
          className={`device-card ${device === "phone" ? "active" : ""}`}
          onClick={() => pickDevice("phone")}
        >
          <strong>Phone</strong>
          <span>Queue songs & search the library</span>
        </button>
        <button
          type="button"
          className={`device-card ${device === "tv" ? "active" : ""}`}
          onClick={() => pickDevice("tv")}
        >
          <strong>Smart TV</strong>
          <span>Stage display for the party</span>
        </button>
      </div>

      <p className="layout-hint">
        Layout follows your screen size — narrow = phone, wide landscape = TV.
        {viewport === "tv" ? " This screen is in TV layout now." : " This screen is in phone layout now."}
      </p>

      <label className="name-field home-name">
        <span>Your name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Optional"
          enterKeyHint="done"
        />
      </label>

      <button
        type="button"
        className="btn btn-primary btn-xl"
        onClick={createRoom}
        disabled={busy}
      >
        {busy ? "Opening…" : "Start a room"}
      </button>

      <form className="join-form" onSubmit={joinRoom}>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Room code"
          maxLength={6}
          aria-label="Room code"
          inputMode="text"
          autoCapitalize="characters"
          autoCorrect="off"
        />
        <button type="submit" className="btn btn-ghost btn-xl" disabled={busy}>
          Join
        </button>
      </form>

      {error ? <p className="form-error">{error}</p> : null}
    </div>
  );
}
