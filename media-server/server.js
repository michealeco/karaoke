import cors from "cors";
import express from "express";
import { createHmac, timingSafeEqual } from "crypto";
import { mkdir, readFile, writeFile, unlink } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import { customAlphabet } from "nanoid";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 4050);
const SECRET = process.env.MEDIA_API_SECRET || "dev-secret-change-me";
const MEDIA_ROOT = process.env.MEDIA_ROOT || path.join(__dirname, "songs");
const LIBRARY_FILE = path.join(MEDIA_ROOT, "library.json");
const PUBLIC_BASE = (process.env.PUBLIC_BASE_URL || `http://127.0.0.1:${PORT}`).replace(
  /\/$/,
  "",
);
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || "*")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 12);

await mkdir(MEDIA_ROOT, { recursive: true });
const META_ROOT = path.join(MEDIA_ROOT, "meta");
await mkdir(META_ROOT, { recursive: true });

function metaFilePath(key) {
  const safe = String(key)
    .replace(/\\/g, "/")
    .replace(/\.\./g, "")
    .replace(/[^a-zA-Z0-9._/-]/g, "_");
  const full = path.join(META_ROOT, safe);
  if (!full.startsWith(META_ROOT)) {
    throw new Error("Invalid meta key");
  }
  return full;
}

const app = express();
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || ALLOWED_ORIGINS.includes("*") || ALLOWED_ORIGINS.includes(origin)) {
        cb(null, true);
        return;
      }
      cb(new Error("Not allowed by CORS"));
    },
  }),
);
app.use(express.json({ limit: "1mb" }));

const storage = multer.diskStorage({
  destination: MEDIA_ROOT,
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}-${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 512 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok =
      file.mimetype.includes("mp4") || file.originalname.toLowerCase().endsWith(".mp4");
    cb(ok ? null : new Error("Only MP4 files are supported"), ok);
  },
});

async function readLibrary() {
  try {
    const raw = await readFile(LIBRARY_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeLibrary(songs) {
  await writeFile(LIBRARY_FILE, JSON.stringify(songs, null, 2), "utf8");
}

function songUrl(filename) {
  return `${PUBLIC_BASE}/media/${encodeURIComponent(filename)}`;
}

function verifyServerSecret(req) {
  const header = req.header("x-media-secret") || "";
  if (!header || header.length !== SECRET.length) return false;
  return timingSafeEqual(Buffer.from(header), Buffer.from(SECRET));
}

function verifyUploadToken(token) {
  if (!token || !token.includes(".")) return false;
  const [payload, sig] = token.split(".");
  const expected = createHmac("sha256", SECRET).update(payload).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return data.purpose === "upload" && typeof data.exp === "number" && data.exp > Date.now();
  } catch {
    return false;
  }
}

function requireServerAuth(req, res, next) {
  if (!verifyServerSecret(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, mediaRoot: MEDIA_ROOT, metaRoot: META_ROOT });
});

app.get("/library", async (req, res) => {
  try {
    let songs = await readLibrary();
    const q = String(req.query.q || "")
      .trim()
      .toLowerCase();
    if (q) {
      songs = songs.filter(
        (s) =>
          String(s.title).toLowerCase().includes(q) ||
          String(s.artist).toLowerCase().includes(q),
      );
    }
    songs = songs
      .map((s) => ({ ...s, url: songUrl(s.filename) }))
      .sort((a, b) => b.createdAt - a.createdAt);
    res.json({ songs });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

app.post("/upload", (req, res) => {
  const bearer = req.header("authorization")?.replace(/^Bearer\s+/i, "") || "";
  const allowed = verifyServerSecret(req) || verifyUploadToken(bearer);
  if (!allowed) {
    res.status(401).json({ error: "Unauthorized upload" });
    return;
  }

  upload.single("file")(req, res, async (err) => {
    if (err) {
      res.status(400).json({ error: err.message || "Upload failed" });
      return;
    }
    try {
      const file = req.file;
      if (!file) {
        res.status(400).json({ error: "MP4 file is required" });
        return;
      }
      const title = String(req.body.title || "").trim();
      const artist = String(req.body.artist || "").trim() || "Unknown";
      if (!title) {
        await unlink(file.path).catch(() => undefined);
        res.status(400).json({ error: "Title is required" });
        return;
      }

      const song = {
        id: nanoid(),
        title,
        artist,
        filename: file.filename,
        url: songUrl(file.filename),
        size: file.size,
        createdAt: Date.now(),
      };

      const songs = await readLibrary();
      songs.unshift(song);
      await writeLibrary(songs);
      res.status(201).json({ song });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
});

app.delete("/songs/:id", requireServerAuth, async (req, res) => {
  try {
    const songs = await readLibrary();
    const song = songs.find((s) => s.id === req.params.id);
    if (!song) {
      res.status(404).json({ error: "Song not found" });
      return;
    }
    const next = songs.filter((s) => s.id !== req.params.id);
    await writeLibrary(next);
    await unlink(path.join(MEDIA_ROOT, song.filename)).catch(() => undefined);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// JSON meta store (rooms / queue state) — Ubuntu is the database
app.get("/meta/*key", requireServerAuth, async (req, res) => {
  try {
    const key = String(req.params.key || "").replace(/^\/+/, "");
    const filePath = metaFilePath(key);
    const raw = await readFile(filePath, "utf8");
    res.type("json").send(raw);
  } catch {
    res.status(404).json({ error: "Not found" });
  }
});

app.put("/meta/*key", requireServerAuth, async (req, res) => {
  try {
    const key = String(req.params.key || "").replace(/^\/+/, "");
    const filePath = metaFilePath(key);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, JSON.stringify(req.body ?? null, null, 2), "utf8");
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

app.delete("/meta/*key", requireServerAuth, async (req, res) => {
  try {
    const key = String(req.params.key || "").replace(/^\/+/, "");
    await unlink(metaFilePath(key)).catch(() => undefined);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// Range-friendly static media for TV/phone video seeking
app.get("/media/:filename", async (req, res) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(MEDIA_ROOT, filename);
  try {
    const { createReadStream, stat } = await import("fs");
    const { promisify } = await import("util");
    const stats = await promisify(stat)(filePath);
    const size = stats.size;
    const range = req.headers.range;

    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");

    if (range) {
      const match = /bytes=(\d+)-(\d*)/.exec(range);
      if (!match) {
        res.status(416).end();
        return;
      }
      const start = Number(match[1]);
      const end = match[2] ? Number(match[2]) : size - 1;
      if (start >= size || end >= size) {
        res.status(416).setHeader("Content-Range", `bytes */${size}`).end();
        return;
      }
      res.status(206);
      res.setHeader("Content-Range", `bytes ${start}-${end}/${size}`);
      res.setHeader("Content-Length", String(end - start + 1));
      createReadStream(filePath, { start, end }).pipe(res);
      return;
    }

    res.setHeader("Content-Length", String(size));
    createReadStream(filePath).pipe(res);
  } catch {
    res.status(404).json({ error: "File not found" });
  }
});

app.listen(PORT, () => {
  console.log(`Chorus media server on ${PUBLIC_BASE}`);
  console.log(`Serving files from ${MEDIA_ROOT}`);
});
