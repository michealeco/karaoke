import { NextResponse } from "next/server";
import { createRoom, enrichRoom } from "@/lib/rooms";

export async function POST() {
  const { room, hostToken } = await createRoom();
  const publicRoom = await enrichRoom(room, hostToken);
  return NextResponse.json({ room: publicRoom, hostToken }, { status: 201 });
}
