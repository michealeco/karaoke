# Chorus media server (Ubuntu / local + ngrok)

Stores and streams karaoke MP4s. The Vercel/Next app talks to this for the song library.

## Quick path with ngrok

Terminal 1 — start the media server:

```bash
cd media-server
cp .env.example .env
npm install
npm start
```

Terminal 2 — expose it:

```bash
ngrok http 4050
```

Copy the HTTPS forwarding URL (example: `https://abc123.ngrok-free.app`).

### Put that URL in both places

**1. `media-server/.env`**
```env
MEDIA_API_SECRET=change-me-to-a-long-random-string
PORT=4050
MEDIA_ROOT=./songs
PUBLIC_BASE_URL=https://abc123.ngrok-free.app
CORS_ORIGINS=https://your-app.vercel.app,http://localhost:3000
```

Restart `npm start` after changing `PUBLIC_BASE_URL` (song playback links use it).

**2. Vercel project env vars** (Settings → Environment Variables)
```env
MEDIA_API_URL=https://abc123.ngrok-free.app
MEDIA_API_SECRET=change-me-to-a-long-random-string
```

Redeploy the Vercel app after saving.

### Notes

- Free ngrok URLs change every restart — update `PUBLIC_BASE_URL`, Vercel `MEDIA_API_URL`, and redeploy (or use a reserved ngrok domain).
- Browser uploads + video playback both hit the ngrok URL.
- If ngrok shows an interstitial page, use a free-account header or paid plan; for API calls from the server, add `ngrok-skip-browser-warning: true` if needed.

Optional ngrok config (`ngrok.yml`):

```yaml
version: "3"
agents:
  # or classic:
# tunnels:
#   chorus-media:
#     addr: 4050
#     proto: http
```

Classic one-liner is enough: `ngrok http 4050`.

## Environment

| Variable | Purpose |
|---|---|
| `PORT` | Listen port (default `4050`) |
| `MEDIA_API_SECRET` | Shared secret with the Next.js app |
| `MEDIA_ROOT` | Folder for MP4s + `library.json` |
| `PUBLIC_BASE_URL` | Public URL used in song playback links (ngrok HTTPS URL) |
| `CORS_ORIGINS` | Comma-separated allowed web origins (your Vercel URL + localhost) |

## Nginx (when you stop using ngrok)

```nginx
server {
  server_name media.example.com;

  client_max_body_size 512m;

  location / {
    proxy_pass http://127.0.0.1:4050;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

## Run as a systemd service (survives reboot)

From the Ubuntu server (paths match `~/karaoke/media-server` as user `micheal`):

```bash
cd ~/karaoke
git pull
cd media-server

# Make sure .env exists and npm deps are installed
cp -n .env.example .env
nano .env   # set MEDIA_API_SECRET, PUBLIC_BASE_URL, CORS_ORIGINS
npm install

# Install the service
sudo cp chorus-media.service /etc/systemd/system/chorus-media.service
sudo systemctl daemon-reload
sudo systemctl enable --now chorus-media
```

Useful commands:

```bash
sudo systemctl status chorus-media
sudo systemctl restart chorus-media
sudo journalctl -u chorus-media -f
```

If your username or clone path is different, edit `User=`, `Group=`, `WorkingDirectory=`, and `EnvironmentFile=` in `/etc/systemd/system/chorus-media.service`, then:

```bash
sudo systemctl daemon-reload
sudo systemctl restart chorus-media
```

**ngrok (multiple apps):** use `ngrok.yml.example` — copy to `~/.config/ngrok/ngrok.yml`, set your other app ports + authtoken, then:

```bash
ngrok start --all
```

Copy the **chorus-media** HTTPS URL into `PUBLIC_BASE_URL` (media-server `.env`) and Vercel `MEDIA_API_URL`, then:

```bash
sudo systemctl restart chorus-media
```
