# gouri-demo.resonor.in

Gouri Lakshmi's portfolio. A single static page (HTML, CSS, vanilla JS, no build step), served by nginx in a container and published through a Cloudflare Tunnel.

```
site/            the website itself (open site/index.html in a browser to preview)
  index.html     all content lives here
  context.json   structured info linked from the page for crawlers
  assets/css     styles and every animation keyframe
  assets/js      motion: letter drops, scroll reveals, smooth scroll, lightbox
  img/           her work, exported from the portfolio PDF as WebP
nginx/           nginx config (security headers, caching, /healthz)
Dockerfile       nginx-unprivileged, runs as non-root
docker-compose.yml
Jenkinsfile      build + deploy pipeline
scripts/verify.py  pre-deploy checks (run by Jenkins, or by hand)
```

## Run it on the server

```bash
unzip allaboutgouri.zip && cd allaboutgouri
docker compose up -d --build
curl -I http://localhost:8088        # should say 200 OK
```

The site listens on `127.0.0.1:8088` only, so nothing is open to the internet until Cloudflare is connected. Change the port with `WEB_PORT` in `.env`.

## Put it on gouri-demo.resonor.in with Cloudflare

**Option A · new tunnel just for this site**

1. Cloudflare dashboard → Zero Trust → Networks → Tunnels → Create a tunnel → Cloudflared → name it `allaboutgouri` → pick **Docker**, and copy the token after `--token`.
2. `cp .env.example .env` and paste it as `CLOUDFLARE_TUNNEL_TOKEN`.
3. In the tunnel's **Public hostnames** tab add:
   - `gouri-demo.resonor.in` → Service `HTTP` → `web:8080`
4. `docker compose --profile tunnel up -d`

**Option B · cloudflared already runs on this server**

Add a public hostname `gouri-demo.resonor.in` → `http://localhost:8088` to your existing tunnel. Only run `docker compose up -d`.

Recommended Cloudflare settings for the zone: SSL/TLS **Full**, Always Use HTTPS **on**, Brotli **on**. Leave Rocket Loader **off** (it rewrites scripts and fights the animations).

## Deploy with Jenkins

The `Jenkinsfile` builds and deploys on the same server Jenkins runs on. Every push to `main` goes live within about 5 minutes.

What each run does:

1. **Verify:** `scripts/verify.py` checks that every image, CSS and JS file the page uses exists, and that the inline script still matches the security policy.
2. **Build:** builds a new image and keeps the current one as `allaboutgouri:previous`.
3. **Deploy:** runs `docker compose up -d`.
4. **Health check:** waits for the container to report healthy and for the page to actually load.
5. **Purge Cloudflare cache:** clears the cache so visitors see the change straight away.

If the health check fails, the previous image is put back automatically.

**One-time setup**

1. On the server: `sudo usermod -aG docker jenkins && sudo systemctl restart jenkins`. Make sure `python3`, `curl` and the Docker compose plugin are installed.
2. In Jenkins: New Item → **Pipeline** → Pipeline script from SCM → Git → `https://github.com/Adhithyan-Anand/allaboutgouri.git`, branch `*/main`, script path `Jenkinsfile`. The repo is public, so no Git credentials are needed.
3. Optional credentials (Manage Jenkins → Credentials → Secret text):

| ID | What | Used for |
| --- | --- | --- |
| `cloudflare-zone-id` | Zone ID from the resonor.in overview page | Cache purge |
| `cloudflare-api-token` | API token with **Zone → Cache Purge** permission for this zone only | Cache purge |
| `cloudflare-tunnel-token` | Tunnel token | Only if you tick `USE_TUNNEL` |

Without the Cloudflare credentials the deploy still works; the run is just marked unstable with a note to purge by hand.

4. Click **Build Now** once. Jenkins needs a first run to pick up the 5-minute polling trigger and the parameters.

For instant deploys instead of polling, expose Jenkins through your Cloudflare tunnel and add a GitHub webhook (`https://<jenkins-host>/github-webhook/`, needs the GitHub plugin). Then you can drop the `pollSCM` line.

## Updating content

- Text: edit `site/index.html`.
- New work: drop a `.webp` into `site/img/` and copy any existing `<figure class="piece">…</figure>` block. Keep `width` and `height` matching the image so the page doesn't jump while loading.
- Link preview card: edit the Open Graph/Twitter tags in the `<head>` of `site/index.html`, keep `site/context.json` in sync, and replace `site/og.jpg` if the preview image changes.
- Then push to `main` and Jenkins deploys it. Without Jenkins: `docker compose up -d --build`, then purge the Cloudflare cache.

If you edit the small inline `<script>` in the `<head>`, its hash in `nginx/default.conf` (Content-Security-Policy) must be updated too, or browsers will block it. `python3 scripts/verify.py` will tell you if it's out of date. Get the new hash with:

```bash
python3 -c "import re,hashlib,base64;s=open('site/index.html').read();m=re.search(r'<script>(.*?)</script>',s,re.S);print(base64.b64encode(hashlib.sha256(m.group(1).encode()).digest()).decode())"
```

## Notes

- Fonts (Righteous and Open Sans) load from Google Fonts. Everything else is self-hosted.
- Visitors with "reduce motion" turned on get the same page with no animation. If JavaScript is off, everything still shows.
- Contact details are in the `#contact` section of `index.html`. The page ends with a Thank You section just before the footer.
