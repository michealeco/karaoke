# Share one ngrok domain (Vault + Karaoke)

Use this when you only have **one** ngrok domain (e.g. `smirk-keep-undone.ngrok-free.dev`).

```text
Internet
   └─ https://smirk-keep-undone.ngrok-free.dev
         └─ Nginx :8088
               ├─ /         → Vault API :3847
               └─ /chorus/  → Karaoke media :4050
```

## 1) Install Nginx and enable the site

```bash
cd ~/karaoke && git pull
sudo apt update
sudo apt install -y nginx

sudo cp ~/karaoke/media-server/nginx-shared-domain.conf /etc/nginx/sites-available/chorus-share
sudo ln -sf /etc/nginx/sites-available/chorus-share /etc/nginx/sites-enabled/chorus-share
sudo rm -f /etc/nginx/sites-enabled/default

sudo nginx -t
sudo systemctl enable --now nginx
sudo systemctl reload nginx
```

## 2) Point media-server at /chorus

```bash
nano ~/karaoke/media-server/.env
```

```env
MEDIA_API_SECRET=IKWLNG
PORT=4050
MEDIA_ROOT=./songs
PUBLIC_BASE_URL=https://smirk-keep-undone.ngrok-free.dev/chorus
CORS_ORIGINS=https://karaoke-gamma-sooty.vercel.app,http://localhost:3000
```

```bash
sudo systemctl restart chorus-media
sudo systemctl status chorus-media --no-pager
```

## 3) Switch ngrok to ONE tunnel → Nginx :8088

Backup and replace config:

```bash
cp ~/.config/ngrok/ngrok.yml ~/.config/ngrok/ngrok.yml.bak
cp ~/karaoke/media-server/ngrok.shared-domain.yml.example ~/.config/ngrok/ngrok.yml
nano ~/.config/ngrok/ngrok.yml
```

Put your real `authtoken` and domain, then:

```bash
pkill ngrok
sudo systemctl restart ngrok
# or: ngrok start --all --config ~/.config/ngrok/ngrok.yml
sudo systemctl status ngrok --no-pager
```

You should see only:

```text
Forwarding  https://smirk-keep-undone.ngrok-free.dev -> http://localhost:8088
```

## 4) Vercel (Karaoke)

Set:

| Name | Value |
|---|---|
| `MEDIA_API_URL` | `https://smirk-keep-undone.ngrok-free.dev/chorus` |
| `MEDIA_API_SECRET` | `IKWLNG` (same as Ubuntu) |

Redeploy.

Eco Fam Vault keeps:

`API_URL=https://smirk-keep-undone.ngrok-free.dev`  
(no `/chorus`)

## 5) Test

```bash
# Karaoke media through Nginx path
curl -s https://smirk-keep-undone.ngrok-free.dev/chorus/health \
  -H "ngrok-skip-browser-warning: true"

# Should return JSON: {"ok":true,...}

curl -s "https://smirk-keep-undone.ngrok-free.dev/chorus/kv?key=test" \
  -H "x-media-secret: IKWLNG" \
  -H "ngrok-skip-browser-warning: true"

# 404 {"error":"Not found"} is OK
# 401 means secret mismatch
```

Also open: `https://YOUR-KARAOKE.vercel.app/api/status`

## After reboot

These should be enabled:

```bash
sudo systemctl enable nginx chorus-media ngrok
```

(Plus whatever service runs Vault on port 3847.)
