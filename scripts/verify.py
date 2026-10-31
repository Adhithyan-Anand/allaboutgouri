#!/usr/bin/env python3
"""Pre-deploy checks for allaboutgouri.in (stdlib only).

1. The inline <script> hash in index.html matches the CSP in nginx/default.conf,
   otherwise browsers would silently block it after deploy.
2. Every local file the page references (images, CSS, JS, icons) exists.
"""
import base64, hashlib, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, "site")
errors = []

html = open(os.path.join(SITE, "index.html"), encoding="utf-8").read()
conf = open(os.path.join(ROOT, "nginx", "default.conf"), encoding="utf-8").read()

# 1. CSP hash
inline = re.findall(r"<script>(.*?)</script>", html, re.S)
csp_hashes = set(re.findall(r"'sha256-([A-Za-z0-9+/=]+)'", conf))
for body in inline:
    h = base64.b64encode(hashlib.sha256(body.encode("utf-8")).digest()).decode()
    if h not in csp_hashes:
        errors.append(f"inline script hash sha256-{h} is not in nginx/default.conf CSP (update both CSP lines)")
if inline and len(csp_hashes) != 1:
    errors.append(f"expected one script hash in nginx/default.conf, found {len(csp_hashes)}")

# 2. local references
refs = re.findall(r'(?:src|href)="([^"#:][^"]*)"', html)
for ref in sorted(set(refs)):
    if ref.startswith(("http", "//", "mailto", "tel")):
        continue
    path = os.path.join(SITE, ref.split("?")[0])
    if not os.path.isfile(path):
        errors.append(f"missing file referenced by index.html: {ref}")

if errors:
    print("verify: FAILED")
    for e in errors:
        print("  -", e)
    sys.exit(1)
print(f"verify: OK ({len(set(refs))} local references, {len(inline)} inline script checked)")
