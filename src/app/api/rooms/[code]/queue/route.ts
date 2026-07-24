import { NextResponse } from "next/server";
import { addToQueue, enrichRoom, removeFromQueue } from "@/lib/rooms";

export async function POST(
  request: Request,
  context: { params: Promise<{ code: string }> },
) {
  const { code } = await context.params;
  const body = (await request.json()) as {
    songId?: string;
    addedBy?: string;
  };

  if (!body.songId) {
    return NextResponse.json({ error: "songId is required" }, { status: 400 });
  }

  try {
    const room = await addToQueue(code, body.songId, body.addedBy ?? "Guest");
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }
    const token = request.headers.get("x-host-token");
    return NextResponse.json({ room: await enrichRoom(room, token) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 },
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ code: string }> },
) {
  const { code } = await context.params;
  const { searchParams } = new URL(request.url);
  const itemId = searchParams.get("itemId");
  if (!itemId) {
    return NextResponse.json({ error: "itemId is required" }, { status: 400 });
  }

  try {
    const token = request.headers.get("x-host-token");
    const room = await removeFromQueue(code, itemId, token);
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }
    return NextResponse.json({ room: await enrichRoom(room, token) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 403 },
    );
  }
}
