# Chorus media server (Ubuntu)

Stores and streams karaoke MP4s. The Vercel/Next app talks to this for the song library.

## Run on Ubuntu

```bash
cd media-server
cp .env.example .env   # edit secrets + public URL
npm install
npm start
```

Default: `http://127.0.0.1:4050`

## Environment

| Variable | Purpose |
|---|---|
| `PORT` | Listen port (default `4050`) |
| `MEDIA_API_SECRET` | Shared secret with the Next.js app |
| `MEDIA_ROOT` | Folder for MP4s + `library.json` |
| `PUBLIC_BASE_URL` | Public URL used in song playback links |
| `CORS_ORIGINS` | Comma-separated allowed web origins (your Vercel URL) |

## Nginx example

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

Use HTTPS (Certbot). Set `PUBLIC_BASE_URL=https://media.example.com`.

## systemd (optional)

```ini
[Unit]
Description=Chorus media server
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/chorus/media-server
EnvironmentFile=/opt/chorus/media-server/.env
ExecStart=/usr/bin/npm start
Restart=always
User=www-data

[Install]
WantedBy=multi-user.target
```
