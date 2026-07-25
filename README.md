# Chorus — Party Karaoke

Party karaoke web app: **songs live on your Ubuntu server**, the web UI can run on **Vercel**.

## Architecture

- **Ubuntu `media-server/`** — songs (MP4s) **and** room/queue JSON
- **Next.js on Vercel** — UI only
- **Recommended (1 ngrok domain):** Nginx path split — see [`media-server/SETUP-SHARED-DOMAIN.md`](media-server/SETUP-SHARED-DOMAIN.md)
  - Vault: `https://your-domain.ngrok-free.dev`
  - Karaoke: `https://your-domain.ngrok-free.dev/chorus`

## 1) Ubuntu setup (shared domain)

Follow **[`media-server/SETUP-SHARED-DOMAIN.md`](media-server/SETUP-SHARED-DOMAIN.md)** end-to-end (Nginx + media service + one ngrok tunnel).

## 2) Run the web app locally

```bash
cp .env.example .env.local
# set MEDIA_API_URL + MEDIA_API_SECRET to match Ubuntu
npm install
npm run dev
```

If `MEDIA_API_URL` is unset, local mode saves MP4s under `public/uploads/` (dev only).

## 3) Deploy the web app to Vercel

1. Set env vars:
   - `MEDIA_API_URL` = `https://smirk-keep-undone.ngrok-free.dev/chorus`
   - `MEDIA_API_SECRET` = same as Ubuntu `.env`
2. Redeploy.

Vercel Blob is **not** required — Ubuntu holds songs and room state.

## How to use

1. Open **Library** and upload karaoke MP4s (they land on Ubuntu).
2. Start/join a room. Layout is responsive:
   - **Narrow / portrait** → phone controller
   - **Wide landscape** → smart TV stage
3. Phones queue songs; the TV plays video from your Ubuntu media URL.

## Stack

- Next.js App Router + TypeScript + Tailwind CSS v4
- Ubuntu Node media server for MP4s + room/queue storage
- ngrok (or Nginx) to expose Ubuntu to Vercel
