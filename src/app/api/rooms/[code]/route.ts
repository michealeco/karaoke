import { NextResponse } from "next/server";
import {
  enrichRoom,
  getRoom,
  setPlayback,
  skipTrack,
} from "@/lib/rooms";

function tokenFrom(request: Request) {
  return request.headers.get("x-host-token");
}

function fail(error: unknown, status = 500) {
  const message = error instanceof Error ? error.message : String(error);
  return NextResponse.json({ error: message }, { status });
}

export async function GET(
  request: Request,
  context: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await context.params;
    const room = await getRoom(code);
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }
    const publicRoom = await enrichRoom(room, tokenFrom(request));
    return NextResponse.json({ room: publicRoom });
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await context.params;
    const body = (await request.json()) as {
      action?: "play" | "pause" | "skip" | "prev" | "seek";
      positionMs?: number;
    };

    let room = null;
    const token = tokenFrom(request);

    switch (body.action) {
      case "play":
        room = await setPlayback(code, token, {
          status: "playing",
          positionMs: body.positionMs,
        });
        break;
      case "pause":
        room = await setPlayback(code, token, {
          status: "paused",
          positionMs: body.positionMs,
        });
        break;
      case "seek":
        room = await setPlayback(code, token, {
          positionMs: body.positionMs ?? 0,
          bumpSeek: true,
          status: "playing",
        });
        break;
      case "skip":
        room = await skipTrack(code, token, 1);
        break;
      case "prev":
        room = await skipTrack(code, token, -1);
        break;
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    return NextResponse.json({ room: await enrichRoom(room, token) });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message === "Host only" ? 403 : 500;
    return fail(error, status);
  }
}
