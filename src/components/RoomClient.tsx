"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RoomPublic, Song } from "@/lib/types";
import {
  getDisplayName,
  getHostToken,
  hostHeaders,
  setDisplayName,
} from "@/lib/client";
import { readResponseJson } from "@/lib/http";
import { useLayoutMode } from "@/lib/useLayoutMode";
import {
  activateTvTarget,
  moveTvFocusDirectional,
  resolveTvRemoteAction,
  trackPointerPosition,
} from "@/lib/tvRemote";
import { SongLibrary } from "./SongLibrary";

type Props = {
  code: string;
};

export function RoomClient({ code }: Props) {
  const mode = useLayoutMode();
  const isTv = mode === "tv";

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
    try {
      const res = await fetch(`/api/rooms/${code}`, {
        headers: hostHeaders(code),
        cache: "no-store",
      });
      const data = await readResponseJson<{
        room?: RoomPublic;
        error?: string;
      }>(res);
      if (!res.ok) {
        setError(data.error || "Room not found");
        return;
      }
      if (data.room) setRoom(data.room);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load room");
    }
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
    if (!isTv) return;
    setHudVisible(true);
    if (hideHudTimer.current) clearTimeout(hideHudTimer.current);
    hideHudTimer.current = setTimeout(() => setHudVisible(false), 5000);
  }, [isTv]);

  useEffect(() => {
    if (!isTv) return;
    bumpHud();
    const onMove = () => bumpHud();
    window.addEventListener("mousemove", onMove);
    window.addEventListener("keydown", onMove);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("keydown", onMove);
      if (hideHudTimer.current) clearTimeout(hideHudTimer.current);
    };
  }, [isTv, bumpHud]);

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
        const data = await readResponseJson<{
          room?: RoomPublic;
          error?: string;
        }>(res);
        if (!res.ok) throw new Error(data.error || "Action failed");
        if (data.room) setRoom(data.room);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Action failed");
      } finally {
        setBusy(false);
      }
    },
    [code, bumpHud],
  );

  const isHost = room?.isHost || Boolean(getHostToken(code));
  const playBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isTv) return;
    // Give the remote a focused target on smart TVs
    const t = window.setTimeout(() => {
      playBtnRef.current?.focus();
    }, 300);
    return () => window.clearTimeout(t);
  }, [isTv, room?.nowPlaying?.id]);

  useEffect(() => {
    if (!isTv) return;

    const onMove = (e: MouseEvent) => trackPointerPosition(e);
    window.addEventListener("mousemove", onMove, true);
    window.addEventListener("pointermove", onMove as EventListener, true);

    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      const action = resolveTvRemoteAction(e);
      if (!action) return;

      e.preventDefault();
      e.stopPropagation();
      bumpHud();

      if (action === "focus-left") {
        moveTvFocusDirectional("left");
        return;
      }
      if (action === "focus-right") {
        moveTvFocusDirectional("right");
        return;
      }
      if (action === "focus-up") {
        moveTvFocusDirectional("up");
        return;
      }
      if (action === "focus-down") {
        moveTvFocusDirectional("down");
        return;
      }
      if (action === "back") {
        return;
      }

      // OK: click focused button OR whatever is under the cursor
      if (action === "ok") {
        if (activateTvTarget()) return;
        if (!isHost) return;
        void control(
          roomRef.current?.status === "playing" ? "pause" : "play",
        );
        return;
      }

      if (!isHost) return;

      if (action === "play") {
        void control("play");
        return;
      }
      if (action === "pause") {
        void control("pause");
        return;
      }
      if (action === "next") {
        void control("skip");
        return;
      }
      if (action === "prev") {
        void control("prev");
      }
    }

    window.addEventListener("keydown", onKey, true);
    document.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("mousemove", onMove, true);
      window.removeEventListener("pointermove", onMove as EventListener, true);
      window.removeEventListener("keydown", onKey, true);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [isTv, isHost, control, bumpHud]);

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
      const data = await readResponseJson<{
        room?: RoomPublic;
        error?: string;
      }>(res);
      if (!res.ok) throw new Error(data.error || "Could not add song");
      if (data.room) setRoom(data.room);
      setTab("queue");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add song");
    } finally {
      setBusy(false);
    }
  }

  async function removeItem(itemId: string) {
    try {
      const res = await fetch(`/api/rooms/${code}/queue?itemId=${itemId}`, {
        method: "DELETE",
        headers: hostHeaders(code),
      });
      const data = await readResponseJson<{
        room?: RoomPublic;
        error?: string;
      }>(res);
      if (res.ok && data.room) setRoom(data.room);
      else setError(data.error || "Host only");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove item");
    }
  }

  function saveName(value: string) {
    setName(value);
    setDisplayName(value);
  }

  const queue = room?.queueSongs ?? [];
  const upNext = queue.filter((_, i) => i > (room?.currentIndex ?? -1)).slice(0, 6);

  if (isTv) {
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
            <div className="role-pill">{isHost ? "TV host" : "TV display"}</div>
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
                      Open Chorus on your phone and join with{" "}
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
                  <div className="tv-transport" role="toolbar" aria-label="Playback">
                    <button
                      type="button"
                      className="btn btn-ghost btn-tv"
                      data-tv-focus
                      tabIndex={0}
                      disabled={busy}
                      onClick={() => control("prev")}
                    >
                      Prev
                    </button>
                    <button
                      ref={playBtnRef}
                      type="button"
                      className="btn btn-primary btn-tv btn-tv-main"
                      data-tv-focus
                      tabIndex={0}
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
                      data-tv-focus
                      tabIndex={0}
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
                  Remote: move cursor or use ↑↓←→ · OK to press · Back exits page
                </p>
              ) : (
                <p className="tv-remote-hint">
                  Open this room on the TV as host (Start a room from the TV), or
                  control playback from the host phone.
                </p>
              )}
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
              <div className="tv-queue-count">{queue.length} in queue</div>
            </aside>
          </div>
        </div>
      </div>
    );
  }

  // Phone / controller layout
  return (
    <div className="phone-room">
      <header className="phone-top">
        <div>
          <p className="eyebrow">Room</p>
          <h1 className="phone-code">{code}</h1>
        </div>
        <div className="role-pill">{isHost ? "Host" : "Guest"}</div>
      </header>

      <label className="name-field phone-name">
        <span>Your name</span>
        <input
          value={name}
          onChange={(e) => saveName(e.target.value)}
          placeholder="Guest"
          enterKeyHint="done"
        />
      </label>

      {error ? <p className="form-error room-error">{error}</p> : null}

      <section className="phone-now panel">
        <p className="eyebrow">Now playing</p>
        <h2>{room?.nowPlaying?.title ?? "Nothing queued"}</h2>
        <p>{room?.nowPlaying?.artist ?? "Add a song from the library"}</p>

        {isHost && room?.nowPlaying ? (
          <div className="phone-video-wrap">
            <video
              ref={videoRef}
              className="stage-video"
              playsInline
              controls
              onPlay={() => {
                if (applyingRemote.current) return;
                void control(
                  "play",
                  Math.floor((videoRef.current?.currentTime || 0) * 1000),
                );
              }}
              onPause={() => {
                if (applyingRemote.current) return;
                void control(
                  "pause",
                  Math.floor((videoRef.current?.currentTime || 0) * 1000),
                );
              }}
              onSeeked={() => {
                if (applyingRemote.current) return;
                void control(
                  "seek",
                  Math.floor((videoRef.current?.currentTime || 0) * 1000),
                );
              }}
              onEnded={() => {
                void control("skip");
              }}
            />
          </div>
        ) : null}

        {isHost ? (
          <div className="phone-transport">
            <button
              type="button"
              className="btn btn-ghost btn-touch"
              disabled={busy}
              onClick={() => control("prev")}
            >
              Prev
            </button>
            <button
              type="button"
              className="btn btn-primary btn-touch"
              disabled={busy || !room?.nowPlaying}
              onClick={() =>
                control(room?.status === "playing" ? "pause" : "play")
              }
            >
              {room?.status === "playing" ? "Pause" : "Play"}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-touch"
              disabled={busy}
              onClick={() => control("skip")}
            >
              Skip
            </button>
          </div>
        ) : (
          <p className="phone-hint">
            Video plays on the TV. Use the tabs below to queue songs.
          </p>
        )}
      </section>

      <div className="phone-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "queue"}
          className={tab === "queue" ? "active" : ""}
          onClick={() => setTab("queue")}
        >
          Queue ({queue.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "library"}
          className={tab === "library" ? "active" : ""}
          onClick={() => setTab("library")}
        >
          Add song
        </button>
      </div>

      <div className="phone-panel">
        {tab === "queue" ? (
          <ul className="phone-list">
            {queue.map((item, index) => {
              const active = index === room?.currentIndex;
              return (
                <li
                  key={item.id}
                  className={`phone-list-item ${active ? "active" : ""}`}
                >
                  <div>
                    <strong>{item.song?.title ?? "Missing song"}</strong>
                    <span>
                      {item.song?.artist ?? "—"} · {item.addedBy}
                    </span>
                  </div>
                  {isHost ? (
                    <button
                      type="button"
                      className="btn btn-ghost btn-touch-sm"
                      onClick={() => removeItem(item.id)}
                    >
                      Remove
                    </button>
                  ) : null}
                </li>
              );
            })}
            {!queue.length ? (
              <li className="muted phone-empty">
                Queue is empty. Tap Add song.
              </li>
            ) : null}
          </ul>
        ) : (
          <SongLibrary compact selectable onSelect={addSong} />
        )}
      </div>
    </div>
  );
}
