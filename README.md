# Chorus — Party Karaoke

Party karaoke web app: **songs live on your Ubuntu server**, the web UI can run on **Vercel**.

## Architecture

- **Ubuntu `media-server/`** — stores MP4s, library JSON, streams video (with HTTP range)
- **Next.js app (Vercel or Ubuntu)** — rooms, queue, phone/TV UI
- Uploads go **directly from the browser → Ubuntu** (not through Vercel Blob)

## 1) Start the Ubuntu media server

```bash
cd media-server
cp .env.example .env
# set MEDIA_API_SECRET, PUBLIC_BASE_URL, CORS_ORIGINS
npm install
npm start
```

Put Nginx in front with HTTPS. See `media-server/README.md`.

## 2) Run the web app locally

```bash
cp .env.example .env.local
# set MEDIA_API_URL + MEDIA_API_SECRET to match Ubuntu
npm install
npm run dev
```

If `MEDIA_API_URL` is unset, local mode saves MP4s under `public/uploads/` (dev only).

## 3) Deploy the web app to Vercel

1. Push this repo and import it in Vercel.
2. Set env vars:
   - `MEDIA_API_URL` = `https://media.example.com`
   - `MEDIA_API_SECRET` = same secret as Ubuntu
3. Create a **Blob** store for **room/queue state only** (not songs).
4. On Ubuntu media-server, set `CORS_ORIGINS` to your Vercel URL.
5. Redeploy.

## How to use

1. Open **Library** and upload karaoke MP4s (they land on Ubuntu).
2. Start/join a room. Layout is responsive:
   - **Narrow / portrait** → phone controller
   - **Wide landscape** → smart TV stage
3. Phones queue songs; the TV plays video from your Ubuntu media URL.

## Stack

- Next.js App Router + TypeScript + Tailwind CSS v4
- Ubuntu Node media server (Express) for MP4 library/streaming
- Vercel Blob optional for room state when hosted on Vercel
