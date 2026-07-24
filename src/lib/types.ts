export type Song = {
  id: string;
  title: string;
  artist: string;
  filename: string;
  url: string;
  size: number;
  createdAt: number;
};

export type QueueItem = {
  id: string;
  songId: string;
  addedBy: string;
  addedAt: number;
};

export type RoomStatus = "idle" | "playing" | "paused";

export type Room = {
  code: string;
  hostToken: string;
  createdAt: number;
  updatedAt: number;
  queue: QueueItem[];
  currentIndex: number;
  status: RoomStatus;
  positionMs: number;
  seekVersion: number;
};

export type RoomPublic = Omit<Room, "hostToken"> & {
  isHost: boolean;
  nowPlaying: Song | null;
  queueSongs: Array<QueueItem & { song: Song | null }>;
};
