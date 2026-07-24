import { NextResponse } from "next/server";
import { addSong, listSongs, searchSongs } from "@/lib/songs";
import { isBlobEnabled, saveLocalUpload } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const songs = q ? await searchSongs(q) : await listSongs();
  return NextResponse.json({ songs, blobEnabled: isBlobEnabled() });
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  // Local / self-host upload path (no Vercel Blob)
  if (contentType.includes("multipart/form-data")) {
    if (isBlobEnabled()) {
      return NextResponse.json(
        {
          error:
            "Large uploads use Vercel Blob. Use the client uploader on this deployment.",
        },
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
    if (!file.type.includes("mp4") && !file.name.toLowerCase().endsWith(".mp4")) {
      return NextResponse.json({ error: "Only MP4 files are supported" }, { status: 400 });
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
  }

  // Metadata-only create after client Blob upload
  const body = (await request.json()) as {
    title?: string;
    artist?: string;
    url?: string;
    filename?: string;
    size?: number;
  };

  if (!body.title?.trim() || !body.url) {
    return NextResponse.json(
      { error: "title and url are required" },
      { status: 400 },
    );
  }

  const song = await addSong({
    title: body.title.trim(),
    artist: (body.artist ?? "").trim() || "Unknown",
    filename: body.filename ?? body.url.split("/").pop() ?? "video.mp4",
    url: body.url,
    size: body.size ?? 0,
  });

  return NextResponse.json({ song }, { status: 201 });
}
