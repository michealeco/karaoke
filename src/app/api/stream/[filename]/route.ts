import { mediaApiUrl } from "@/lib/media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type Ctx = { params: Promise<{ filename: string }> };

/**
 * Proxy MP4s through Vercel so every phone/TV can play them.
 * Upstream ngrok gets the skip-browser-warning header (video tags cannot set it).
 */
export async function GET(request: Request, context: Ctx) {
  const { filename: raw } = await context.params;
  const filename = decodeURIComponent(raw).replace(/[/\\]/g, "");
  if (!filename || filename.includes("..")) {
    return new Response("Invalid file", { status: 400 });
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

  return new Response(res.body, { status: res.status, headers: out });
}
