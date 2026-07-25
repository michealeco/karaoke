import { NextResponse } from "next/server";
import { removeSong } from "@/lib/songs";
import {
  isLibraryAdminAuthorized,
  libraryAdminUnauthorized,
} from "@/lib/libraryAdmin";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    if (!isLibraryAdminAuthorized(request)) {
      return libraryAdminUnauthorized();
    }

    const { id } = await context.params;
    const ok = await removeSong(id);
    if (!ok) {
      return NextResponse.json({ error: "Song not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
