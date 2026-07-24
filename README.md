# Chorus — Party Karaoke

Party karaoke web app: upload MP4s, share a room code, search the library, and run a live queue.

Built with **Next.js** so you can deploy to **Vercel**, or run it on your Ubuntu server with local file storage.

## Features

- Create / join party rooms with a short code
- Shared song library with search
- MP4 uploads (karaoke videos with burned-in lyrics)
- Live queue everyone can add to
- Host controls: play, pause, skip, remove queue items

## Quick start (local or Ubuntu)

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Without Vercel Blob configured, uploads are saved to `public/uploads/` and room/library data to `data/`.

### Production on Ubuntu

```bash
npm run build
npm start
```

Put Nginx/Caddy in front if you want HTTPS and a domain.

## Deploy to Vercel

1. Push this repo to GitHub.
2. Import the project in [Vercel](https://vercel.com/new).
3. Create a **Blob** store for the project (Storage → Blob).
4. Redeploy so `BLOB_READ_WRITE_TOKEN` is available.
5. Upload MP4s from the Library page (client upload supports large files).

### Important Vercel notes

- Karaoke MP4s are usually larger than the serverless request body limit, so production uploads go **directly to Vercel Blob**.
- Room/queue state is also stored in Blob JSON when the token is present.
- For heavier multi-room traffic later, swap room state to Redis/Postgres; the current store is fine for parties and small groups.

## How to use

1. Open **Library** and upload karaoke MP4s (title + artist).
2. On the home page, **Start a room** or **Start on TV**.
3. Share the room code. Guests join from their phones.
4. Anyone can search the library and add songs to the queue.
5. On the big screen, open **TV display** for a 10-foot layout (remote: Enter/Space, ←/→, Esc).

## Stack

- Next.js App Router + TypeScript
- Tailwind CSS v4
- `@vercel/blob` for cloud uploads
- Local filesystem fallback for Ubuntu / local dev
