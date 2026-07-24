import { NextResponse } from "next/server";
import { createRoom, enrichRoom } from "@/lib/rooms";

function fail(error: unknown, status = 500) {
  const message = error instanceof Error ? error.message : String(error);
  return NextResponse.json({ error: message }, { status });
}

export async function POST() {
  try {
    const { room, hostToken } = await createRoom();
    const publicRoom = await enrichRoom(room, hostToken);
    return NextResponse.json({ room: publicRoom, hostToken }, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
