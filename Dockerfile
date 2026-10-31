# allaboutgouri.in · static portfolio served by nginx (runs as non-root)
FROM nginxinc/nginx-unprivileged:1.27-alpine

LABEL org.opencontainers.image.title="allaboutgouri" \
      org.opencontainers.image.source="https://github.com/Adhithyan-Anand/allaboutgouri"

COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --chown=nginx:nginx site/ /usr/share/nginx/html/

EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
