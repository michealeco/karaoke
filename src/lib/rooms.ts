import { customAlphabet } from "nanoid";
import type { QueueItem, Room, RoomPublic, RoomStatus } from "./types";
import { deleteJson, readJson, writeJson } from "./storage";
import { getSong, listSongs } from "./songs";
import { toClientSong } from "./publicMedia";

const roomCode = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 6);
const id = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 10);
const hostToken = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 24);

function roomKey(code: string) {
  return `rooms/${code.toUpperCase()}.json`;
}

export async function createRoom(): Promise<{ room: Room; hostToken: string }> {
  let code = roomCode();
  for (let i = 0; i < 5; i++) {
    const existing = await readJson<Room | null>(roomKey(code), null);
    if (!existing) break;
    code = roomCode();
  }

  const token = hostToken();
  const now = Date.now();
  const room: Room = {
    code,
    hostToken: token,
    createdAt: now,
    updatedAt: now,
    queue: [],
    currentIndex: -1,
    status: "idle",
    positionMs: 0,
    seekVersion: 0,
  };

  await writeJson(roomKey(code), room);
  return { room, hostToken: token };
}

export async function getRoom(code: string): Promise<Room | null> {
  return readJson<Room | null>(roomKey(code), null);
}

export async function saveRoom(room: Room): Promise<Room> {
  room.updatedAt = Date.now();
  await writeJson(roomKey(room.code), room);
  return room;
}

export async function deleteRoom(code: string): Promise<void> {
  await deleteJson(roomKey(code));
}

export function toPublicRoom(room: Room, token?: string | null): RoomPublic {
  const isHost = Boolean(token && token === room.hostToken);
  return {
    code: room.code,
    createdAt: room.createdAt,
    updatedAt: room.updatedAt,
    queue: room.queue,
    currentIndex: room.currentIndex,
    status: room.status,
    positionMs: room.positionMs,
    seekVersion: room.seekVersion,
    isHost,
    nowPlaying: null,
    queueSongs: [],
  };
}

export async function enrichRoom(
  room: Room,
  token?: string | null,
): Promise<RoomPublic> {
  const songs = await listSongs();
  const byId = new Map(songs.map((s) => [s.id, s]));
  const publicRoom = toPublicRoom(room, token);

  publicRoom.queueSongs = room.queue.map((item) => ({
    ...item,
    song: (() => {
      const song = byId.get(item.songId) ?? null;
      return song ? toClientSong(song) : null;
    })(),
  }));

  const current = room.queue[room.currentIndex];
  const playing = current ? (byId.get(current.songId) ?? null) : null;
  publicRoom.nowPlaying = playing ? toClientSong(playing) : null;

  return publicRoom;
}

export async function addToQueue(
  code: string,
  songId: string,
  addedBy: string,
): Promise<Room | null> {
  const room = await getRoom(code);
  if (!room) return null;

  const song = await getSong(songId);
  if (!song) throw new Error("Song not found");

  const item: QueueItem = {
    id: id(),
    songId,
    addedBy: addedBy.trim() || "Guest",
    addedAt: Date.now(),
  };

  room.queue.push(item);
  if (room.currentIndex < 0) {
    room.currentIndex = 0;
    room.status = "playing";
    room.positionMs = 0;
    room.seekVersion += 1;
  }

  return saveRoom(room);
}

export async function removeFromQueue(
  code: string,
  itemId: string,
  token?: string | null,
): Promise<Room | null> {
  const room = await getRoom(code);
  if (!room) return null;
  if (token !== room.hostToken) throw new Error("Host only");

  const index = room.queue.findIndex((q) => q.id === itemId);
  if (index < 0) return room;

  room.queue.splice(index, 1);

  if (room.queue.length === 0) {
    room.currentIndex = -1;
    room.status = "idle";
    room.positionMs = 0;
  } else if (index < room.currentIndex) {
    room.currentIndex -= 1;
  } else if (index === room.currentIndex) {
    if (room.currentIndex >= room.queue.length) {
      room.currentIndex = room.queue.length - 1;
    }
    room.positionMs = 0;
    room.seekVersion += 1;
    room.status = room.queue.length ? "playing" : "idle";
  }

  return saveRoom(room);
}

export async function skipTrack(
  code: string,
  token?: string | null,
  direction: 1 | -1 = 1,
): Promise<Room | null> {
  const room = await getRoom(code);
  if (!room) return null;
  if (token !== room.hostToken) throw new Error("Host only");
  if (room.queue.length === 0) return room;

  const next = room.currentIndex + direction;
  if (next < 0 || next >= room.queue.length) {
    if (direction > 0) {
      room.currentIndex = -1;
      room.status = "idle";
      room.positionMs = 0;
      room.seekVersion += 1;
    }
    return saveRoom(room);
  }

  room.currentIndex = next;
  room.status = "playing";
  room.positionMs = 0;
  room.seekVersion += 1;
  return saveRoom(room);
}

export async function setPlayback(
  code: string,
  token: string | null | undefined,
  patch: {
    status?: RoomStatus;
    positionMs?: number;
    bumpSeek?: boolean;
  },
): Promise<Room | null> {
  const room = await getRoom(code);
  if (!room) return null;
  if (token !== room.hostToken) throw new Error("Host only");

  if (patch.status) room.status = patch.status;
  if (typeof patch.positionMs === "number") room.positionMs = patch.positionMs;
  if (patch.bumpSeek) room.seekVersion += 1;

  return saveRoom(room);
}
