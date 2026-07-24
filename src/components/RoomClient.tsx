"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { RoomPublic, Song } from "@/lib/types";
import {
  getDisplayName,
  getHostToken,
  hostHeaders,
  setDisplayName,
} from "@/lib/client";
import { SongLibrary } from "./SongLibrary";

type Props = {
  code: string;
};

export function RoomClient({ code }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tvMode = searchParams.get("tv") === "1";

  const [room, setRoom] = useState<RoomPublic | null>(null);
  const [name, setName] = useState("Guest");
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"queue" | "library">("queue");
  const [busy, setBusy] = useState(false);
  const [hudVisible, setHudVisible] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastSeekVersion = useRef(-1);
  const applyingRemote = useRef(false);
  const hideHudTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roomRef = useRef<RoomPublic | null>(null);
  const busyRef = useRef(false);

  roomRef.current = room;
  busyRef.current = busy;

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/rooms/${code}`, {
      headers: hostHeaders(code),
      cache: "no-store",
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Room not found");
      return;
    }
    setRoom(data.room);
    setError(null);
  }, [code]);

  useEffect(() => {
    setName(getDisplayName());
    void refresh();
    const id = setInterval(() => void refresh(), 1500);
    return () => clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !room) return;

    const src = room.nowPlaying?.url;
    if (src && video.dataset.songUrl !== src) {
      video.dataset.songUrl = src;
      video.src = src;
      video.load();
      lastSeekVersion.current = -1;
    }

    if (!room.nowPlaying) {
      video.removeAttribute("src");
      delete video.dataset.songUrl;
      video.load();
      return;
    }

    if (lastSeekVersion.current !== room.seekVersion) {
      applyingRemote.current = true;
      const target = (room.positionMs || 0) / 1000;
      const onSeeked = () => {
        applyingRemote.current = false;
        video.removeEventListener("seeked", onSeeked);
      };
      video.addEventListener("seeked", onSeeked);
      video.currentTime = target;
      lastSeekVersion.current = room.seekVersion;
    }

    if (room.status === "playing") {
      void video.play().catch(() => undefined);
    } else {
      video.pause();
    }
  }, [room]);

  const bumpHud = useCallback(() => {
    if (!tvMode) return;
    setHudVisible(true);
    if (hideHudTimer.current) clearTimeout(hideHudTimer.current);
    hideHudTimer.current = setTimeout(() => setHudVisible(false), 5000);
  }, [tvMode]);

  useEffect(() => {
    if (!tvMode) return;
    bumpHud();
    const onMove = () => bumpHud();
    window.addEventListener("mousemove", onMove);
    window.addEventListener("keydown", onMove);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("keydown", onMove);
      if (hideHudTimer.current) clearTimeout(hideHudTimer.current);
    };
  }, [tvMode, bumpHud]);

  const control = useCallback(
    async (
      action: "play" | "pause" | "skip" | "prev" | "seek",
      positionMs?: number,
    ) => {
      if (busyRef.current) return;
      setBusy(true);
      bumpHud();
      try {
        const res = await fetch(`/api/rooms/${code}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...hostHeaders(code),
          },
          body: JSON.stringify({ action, positionMs }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Action failed");
        setRoom(data.room);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Action failed");
      } finally {
        setBusy(false);
      }
    },
    [code, bumpHud],
  );

  const isHost = room?.isHost || Boolean(getHostToken(code));

  useEffect(() => {
    if (!tvMode || !isHost) return;

    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (e.key === " " || e.key === "k" || e.key === "K" || e.key === "Enter") {
        e.preventDefault();
        void control(roomRef.current?.status === "playing" ? "pause" : "play");
      } else if (e.key === "ArrowRight" || e.key === "n" || e.key === "N") {
        e.preventDefault();
        void control("skip");
      } else if (e.key === "ArrowLeft" || e.key === "p" || e.key === "P") {
        e.preventDefault();
        void control("prev");
      } else if (e.key === "Escape") {
        router.push(`/room/${code}`);
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tvMode, isHost, code, router, control]);

  async function addSong(song: Song) {
    setBusy(true);
    try {
      const res = await fetch(`/api/rooms/${code}/queue`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...hostHeaders(code),
        },
        body: JSON.stringify({ songId: song.id, addedBy: name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not add song");
      setRoom(data.room);
      setTab("queue");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add song");
    } finally {
      setBusy(false);
    }
  }

  async function removeItem(itemId: string) {
    const res = await fetch(`/api/rooms/${code}/queue?itemId=${itemId}`, {
      method: "DELETE",
      headers: hostHeaders(code),
    });
    const data = await res.json();
    if (res.ok) setRoom(data.room);
    else setError(data.error || "Host only");
  }

  function saveName(value: string) {
    setName(value);
    setDisplayName(value);
  }

  function setTvMode(enabled: boolean) {
    router.push(enabled ? `/room/${code}?tv=1` : `/room/${code}`);
  }

  const queue = room?.queueSongs ?? [];
  const upNext = queue.filter((_, i) => i > (room?.currentIndex ?? -1)).slice(0, 5);

  if (tvMode) {
    return (
      <div className={`tv-shell ${hudVisible ? "hud-on" : "hud-off"}`}>
        <div className="tv-safe">
          <header className="tv-top">
            <div className="tv-brand-block">
              <p className="eyebrow">Chorus</p>
              <p className="tv-join">
                Join on your phone · room <strong>{code}</strong>
              </p>
            </div>
            <div className="tv-top-actions">
              <span className="role-pill">{isHost ? "TV host" : "TV display"}</span>
              <Link href={`/room/${code}`} className="btn btn-ghost btn-tv">
                Exit TV
              </Link>
            </div>
          </header>

          {error ? <p className="form-error room-error">{error}</p> : null}

          <div className="tv-grid">
            <section className="tv-stage">
              <div className="tv-stage-frame">
                {room?.nowPlaying ? (
                  <video
                    ref={videoRef}
                    className="stage-video"
                    playsInline
                    controls={false}
                    onEnded={() => {
                      if (isHost) void control("skip");
                    }}
                  />
                ) : (
                  <div className="stage-empty tv-empty">
                    <p>Waiting for the first song…</p>
                    <p className="tv-empty-hint">
                      Guests can add tracks from their phones using code{" "}
                      <strong>{code}</strong>
                    </p>
                  </div>
                )}
              </div>

              <div className="tv-now">
                <div>
                  <p className="eyebrow">Now playing</p>
                  <h1>{room?.nowPlaying?.title ?? "Nothing queued"}</h1>
                  <p className="tv-artist">
                    {room?.nowPlaying?.artist ?? "Queue a song from a phone"}
                  </p>
                </div>

                {isHost ? (
                  <div className="tv-transport">
                    <button
                      type="button"
                      className="btn btn-ghost btn-tv"
                      disabled={busy}
                      onClick={() => control("prev")}
                    >
                      Prev
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-tv btn-tv-main"
                      disabled={busy || !room?.nowPlaying}
                      onClick={() =>
                        control(room?.status === "playing" ? "pause" : "play")
                      }
                    >
                      {room?.status === "playing" ? "Pause" : "Play"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-tv"
                      disabled={busy}
                      onClick={() => control("skip")}
                    >
                      Skip
                    </button>
                  </div>
                ) : null}
              </div>

              {isHost ? (
                <p className="tv-remote-hint">
                  Remote: Enter / Space play · ← prev · → skip · Esc exit
                </p>
              ) : null}
            </section>

            <aside className="tv-rail">
              <h2>Up next</h2>
              <ul className="tv-queue">
                {upNext.map((item, index) => (
                  <li key={item.id} className="tv-queue-item">
                    <span className="tv-queue-num">{index + 1}</span>
                    <div>
                      <strong>{item.song?.title ?? "Missing song"}</strong>
                      <span>
                        {item.song?.artist ?? "—"} · {item.addedBy}
                      </span>
                    </div>
                  </li>
                ))}
                {!upNext.length ? (
                  <li className="tv-queue-empty">No songs waiting</li>
                ) : null}
              </ul>

              <div className="tv-queue-count">
                {queue.length} in queue
              </div>
            </aside>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="room-shell">
      <header className="room-top">
        <div>
          <p className="eyebrow">Room</p>
          <h1 className="room-code">{code}</h1>
        </div>
        <label className="name-field">
          <span>Your name</span>
          <input
            value={name}
            onChange={(e) => saveName(e.target.value)}
            placeholder="Guest"
          />
        </label>
        <div className="room-top-right">
          <div className="role-pill">{isHost ? "Host controls" : "Guest"}</div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setTvMode(true)}
          >
            TV display
          </button>
        </div>
      </header>

      {error ? <p className="form-error room-error">{error}</p> : null}

      <div className="room-grid">
        <section className="stage panel">
          <div className="stage-frame">
            {room?.nowPlaying ? (
              <video
                ref={videoRef}
                className="stage-video"
                playsInline
                controls={isHost}
                onPlay={() => {
                  if (!isHost || applyingRemote.current) return;
                  void control(
                    "play",
                    Math.floor((videoRef.current?.currentTime || 0) * 1000),
                  );
                }}
                onPause={() => {
                  if (!isHost || applyingRemote.current) return;
                  void control(
                    "pause",
                    Math.floor((videoRef.current?.currentTime || 0) * 1000),
                  );
                }}
                onSeeked={() => {
                  if (!isHost || applyingRemote.current) return;
                  void control(
                    "seek",
                    Math.floor((videoRef.current?.currentTime || 0) * 1000),
                  );
                }}
                onEnded={() => {
                  if (isHost) void control("skip");
                }}
              />
            ) : (
              <div className="stage-empty">
                <p>Waiting for the first song…</p>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setTab("library")}
                >
                  Pick a track
                </button>
              </div>
            )}
          </div>

          <div className="now-playing">
            <div>
              <p className="eyebrow">Now playing</p>
              <h2>{room?.nowPlaying?.title ?? "Nothing queued"}</h2>
              <p>{room?.nowPlaying?.artist ?? "Add a song from the library"}</p>
            </div>
            {isHost ? (
              <div className="transport">
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={busy}
                  onClick={() => control("prev")}
                >
                  Prev
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={busy || !room?.nowPlaying}
                  onClick={() =>
                    control(room?.status === "playing" ? "pause" : "play")
                  }
                >
                  {room?.status === "playing" ? "Pause" : "Play"}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={busy}
                  onClick={() => control("skip")}
                >
                  Skip
                </button>
              </div>
            ) : null}
          </div>
        </section>

        <aside className="side panel">
          <div className="tabs">
            <button
              type="button"
              className={tab === "queue" ? "active" : ""}
              onClick={() => setTab("queue")}
            >
              Queue ({room?.queue?.length ?? 0})
            </button>
            <button
              type="button"
              className={tab === "library" ? "active" : ""}
              onClick={() => setTab("library")}
            >
              Library
            </button>
          </div>

          {tab === "queue" ? (
            <ul className="queue-list">
              {(room?.queueSongs ?? []).map((item, index) => {
                const active = index === room?.currentIndex;
                return (
                  <li
                    key={item.id}
                    className={`queue-item ${active ? "active" : ""}`}
                  >
                    <div>
                      <strong>{item.song?.title ?? "Missing song"}</strong>
                      <span>
                        {item.song?.artist ?? "—"} · added by {item.addedBy}
                      </span>
                    </div>
                    {isHost ? (
                      <button
                        type="button"
                        className="btn btn-ghost btn-small"
                        onClick={() => removeItem(item.id)}
                      >
                        Remove
                      </button>
                    ) : null}
                  </li>
                );
              })}
              {!room?.queueSongs?.length ? (
                <li className="muted">Queue is empty. Add something catchy.</li>
              ) : null}
            </ul>
          ) : (
            <SongLibrary compact selectable onSelect={addSong} />
          )}
        </aside>
      </div>
    </div>
  );
}
