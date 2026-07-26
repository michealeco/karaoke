import { mediaApiUrl } from "@/lib/media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Proxy MP4s through Vercel so every phone/TV can play them.
 * Upstream ngrok gets the skip-browser-warning header (video tags cannot set it).
 *
 * Use: /api/stream?f=filename.mp4
 */
export async function GET(request: Request) {
  const fileParam = new URL(request.url).searchParams.get("f")?.trim() || "";
  const filename = decodeURIComponent(fileParam).replace(/[/\\]/g, "");
  if (!filename || filename.includes("..")) {
    return Response.json({ error: "Missing or invalid file" }, { status: 400 });
  }

  let base: string;
  try {
    base = mediaApiUrl();
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 503 },
    );
  }

  const upstream = `${base}/media/${encodeURIComponent(filename)}`;
  const headers = new Headers();
  headers.set("ngrok-skip-browser-warning", "true");
  // Some free-ngrok edges only skip the interstitial for non-browser UAs
  headers.set(
    "User-Agent",
    "ChorusMediaProxy/1.0 (+https://vercel.app; karaoke-stream)",
  );
  const range = request.headers.get("range");
  if (range) headers.set("range", range);

  let res: Response;
  try {
    res = await fetch(upstream, { headers, cache: "no-store" });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not reach media server",
      },
      { status: 502 },
    );
  }

  const contentType = res.headers.get("content-type") || "";
  if (!res.ok || contentType.includes("text/html")) {
    const snippet = (await res.text()).replace(/\s+/g, " ").slice(0, 160);
    return Response.json(
      {
        error: `Media upstream failed (${res.status} ${contentType}): ${snippet || "empty"}`,
      },
      { status: 502 },
    );
  }

  const out = new Headers();
  const pass = [
    "content-type",
    "content-length",
    "content-range",
    "accept-ranges",
    "cache-control",
  ] as const;
  for (const key of pass) {
    const value = res.headers.get(key);
    if (value) out.set(key, value);
  }
  if (!out.has("content-type")) out.set("content-type", "video/mp4");
  if (!out.has("accept-ranges")) out.set("accept-ranges", "bytes");
  out.set("access-control-allow-origin", "*");
  out.set("cache-control", "public, max-age=3600");

  return new Response(res.body, { status: res.status, headers: out });
}
