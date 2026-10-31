# allaboutgouri.in

Gouri Lakshmi's portfolio. A single static page (HTML, CSS, vanilla JS, no build step), served by nginx in a container and published through a Cloudflare Tunnel.

```
site/            the website itself (open site/index.html in a browser to preview)
  index.html     all content lives here
  assets/css     styles and every animation keyframe
  assets/js      motion: letter drops, scroll reveals, smooth scroll, lightbox
  img/           her work, exported from the portfolio PDF as WebP
nginx/           nginx config (security headers, caching, /healthz)
Dockerfile       nginx-unprivileged, runs as non-root
docker-compose.yml
```

## Run it on the server

```bash
unzip allaboutgouri.zip && cd allaboutgouri
docker compose up -d --build
curl -I http://localhost:8088        # should say 200 OK
```

The site listens on `127.0.0.1:8088` only, so nothing is open to the internet until Cloudflare is connected. Change the port with `WEB_PORT` in `.env`.

## Put it on allaboutgouri.in with Cloudflare

**Option A · new tunnel just for this site**

1. Cloudflare dashboard → Zero Trust → Networks → Tunnels → Create a tunnel → Cloudflared → name it `allaboutgouri` → pick **Docker**, and copy the token after `--token`.
2. `cp .env.example .env` and paste it as `CLOUDFLARE_TUNNEL_TOKEN`.
3. In the tunnel's **Public hostnames** tab add:
   - `allaboutgouri.in` → Service `HTTP` → `web:8080`
   - `www.allaboutgouri.in` → Service `HTTP` → `web:8080` (or a redirect rule to the apex)
4. `docker compose --profile tunnel up -d`

**Option B · cloudflared already runs on this server**

Add a public hostname `allaboutgouri.in` → `http://localhost:8088` to your existing tunnel. Only run `docker compose up -d`.

Recommended Cloudflare settings for the zone: SSL/TLS **Full**, Always Use HTTPS **on**, Brotli **on**. Leave Rocket Loader **off** (it rewrites scripts and fights the animations).

## Updating content

- Text: edit `site/index.html`.
- New work: drop a `.webp` into `site/img/` and copy any existing `<figure class="piece">…</figure>` block. Keep `width` and `height` matching the image so the page doesn't jump while loading.
- Then `docker compose up -d --build`, and purge the Cloudflare cache if the change doesn't show.

If you edit the small inline `<script>` in the `<head>`, its hash in `nginx/default.conf` (Content-Security-Policy) must be updated too, or browsers will block it. Get the new hash with:

```bash
python3 -c "import re,hashlib,base64;s=open('site/index.html').read();m=re.search(r'<script>(.*?)</script>',s,re.S);print(base64.b64encode(hashlib.sha256(m.group(1).encode()).digest()).decode())"
```

## Notes

- Fonts (Righteous and Open Sans) load from Google Fonts. Everything else is self-hosted.
- Visitors with "reduce motion" turned on get the same page with no animation. If JavaScript is off, everything still shows.
- Contact details are in the `#contact` section of `index.html`. The page ends with a Thank You section just before the footer.
