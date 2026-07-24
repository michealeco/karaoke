import { NextResponse } from "next/server";
import { removeSong } from "@/lib/songs";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const ok = await removeSong(id);
  if (!ok) {
    return NextResponse.json({ error: "Song not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
