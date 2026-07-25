# Chorus — Party Karaoke

Party karaoke for **smart TV + phones**. Songs live on your Ubuntu server; the web UI can run on Vercel.

---

## How to use (party night)

Do these steps in order.

### 1. Add songs first

1. Open the site → **Library** (top menu), or go to `/library`.
2. Enter the **song title** (and optional artist).
3. Choose a karaoke **.mp4** that already has lyrics on the video.
4. Tap **Add to library** and wait until upload finishes.

Rooms can only play songs that are already in the library.

### 2. Start the room on the TV

1. On the smart TV browser, open the same Chorus website.
2. Choose **Smart TV**.
3. Tap **Start a room on this TV**.
4. Leave that page open — phones need the **room code** on screen.

**Remote tip:** point at a button and press OK, or use ↑ ↓ ← → then OK.

### 3. Join from phones

1. On each phone, open the same website.
2. Choose **Phone**.
3. Type the **room code from the TV**, then tap **Join room**.

### 4. Queue and sing

1. On a phone, open the **Add song** tab.
2. Search, then tap **Add to queue**.
3. On the TV, press **Play**. Use **Skip** / **Prev** as needed.

### In-app tutorial

The live site also has **How to** in the top menu (`/how-to`) with the same walkthrough and troubleshooting.

---

## If something doesn’t work

| Problem | What to do |
| --- | --- |
| Room not found | Match the 6-letter code on the TV; use the same website URL |
| No songs | Upload MP4s in **Library** first |
| TV looks like a phone | On home, tap **Smart TV**, then start/join again |
| Video won’t play | Start the room from the TV (host), queue a song, press **Play** |
| Upload fails | Media server must be online; check env vars below |

---

## Architecture

- **Ubuntu `media-server/`** — MP4s + room/queue JSON
- **Next.js on Vercel** — UI only
- **Recommended (1 ngrok domain):** Nginx path split — see [`media-server/SETUP-SHARED-DOMAIN.md`](media-server/SETUP-SHARED-DOMAIN.md)
  - Vault: `https://your-domain.ngrok-free.dev`
  - Karaoke: `https://your-domain.ngrok-free.dev/chorus`

## Host setup — Ubuntu

Follow **[`media-server/SETUP-SHARED-DOMAIN.md`](media-server/SETUP-SHARED-DOMAIN.md)** end-to-end (Nginx + media service + one ngrok tunnel).

## Host setup — run the web app locally

```bash
cp .env.example .env.local
# set MEDIA_API_URL + MEDIA_API_SECRET to match Ubuntu
npm install
npm run dev
```

If `MEDIA_API_URL` is unset, local mode saves MP4s under `public/uploads/` (dev only).

## Host setup — deploy to Vercel

1. Set env vars:
   - `MEDIA_API_URL` = `https://smirk-keep-undone.ngrok-free.dev/chorus`
   - `MEDIA_API_SECRET` = same as Ubuntu `.env`
2. Redeploy.

Vercel Blob is **not** required — Ubuntu holds songs and room state.

## Stack

- Next.js App Router + TypeScript + Tailwind CSS v4
- Ubuntu Node media server for MP4s + room/queue storage
- ngrok (or Nginx) to expose Ubuntu to Vercel
