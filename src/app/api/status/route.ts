import { NextResponse } from "next/server";
import { isRemoteMediaEnabled } from "@/lib/media";

export async function GET() {
  const mediaUrl = process.env.MEDIA_API_URL?.replace(/\/$/, "") || null;
  const hasSecret = Boolean(process.env.MEDIA_API_SECRET);
  const configured = isRemoteMediaEnabled();

  let mediaReachable: boolean | null = null;
  let mediaError: string | null = null;

  if (configured && mediaUrl) {
    try {
      const res = await fetch(`${mediaUrl}/health`, {
        headers: {
          "ngrok-skip-browser-warning": "true",
          "x-media-secret": process.env.MEDIA_API_SECRET || "",
        },
        cache: "no-store",
      });
      mediaReachable = res.ok;
      if (!res.ok) mediaError = `Media server HTTP ${res.status}`;
    } catch (error) {
      mediaReachable = false;
      mediaError = error instanceof Error ? error.message : String(error);
    }
  }

  return NextResponse.json({
    ok: configured && mediaReachable === true,
    configured,
    mediaApiUrlSet: Boolean(mediaUrl),
    mediaApiSecretSet: hasSecret,
    mediaApiUrl: mediaUrl,
    mediaReachable,
    mediaError,
    help: configured
      ? mediaReachable
        ? "Ubuntu storage looks good."
        : "Env vars are set, but Vercel cannot reach your media server. Check ngrok is running and MEDIA_API_URL matches the current ngrok HTTPS URL."
      : "In Vercel → Project → Settings → Environment Variables, add MEDIA_API_URL and MEDIA_API_SECRET, then Redeploy.",
  });
}
