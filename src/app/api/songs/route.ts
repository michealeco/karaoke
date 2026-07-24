import { NextResponse } from "next/server";
import { addSong, listSongs, searchSongs, songsStorageMode } from "@/lib/songs";
import { isBlobEnabled, saveLocalUpload } from "@/lib/storage";
import { isRemoteMediaEnabled } from "@/lib/media";

export const runtime = "nodejs";

function fail(error: unknown, status = 500) {
  const message = error instanceof Error ? error.message : String(error);
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") ?? "";
    const songs = q ? await searchSongs(q) : await listSongs();
    return NextResponse.json({
      songs,
      mode: songsStorageMode(),
      // legacy flag — uploads no longer use Vercel Blob for songs
      blobEnabled: false,
      remoteMedia: isRemoteMediaEnabled(),
      localUploads: !isRemoteMediaEnabled() && !isBlobEnabled(),
    });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    if (isRemoteMediaEnabled()) {
      return NextResponse.json(
        {
          error:
            "Songs are stored on your Ubuntu server. The Library page uploads there directly.",
        },
        { status: 400 },
      );
    }

    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Send multipart form data with an MP4 file" },
        { status: 400 },
      );
    }

    const form = await request.formData();
    const file = form.get("file");
    const title = String(form.get("title") ?? "").trim();
    const artist = String(form.get("artist") ?? "").trim();

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "MP4 file is required" }, { status: 400 });
    }
    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    if (
      !file.type.includes("mp4") &&
      !file.name.toLowerCase().endsWith(".mp4")
    ) {
      return NextResponse.json(
        { error: "Only MP4 files are supported" },
        { status: 400 },
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const saved = await saveLocalUpload(file.name, bytes);
    const song = await addSong({
      title,
      artist: artist || "Unknown",
      filename: saved.filename,
      url: saved.url,
      size: file.size,
    });

    return NextResponse.json({ song }, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
