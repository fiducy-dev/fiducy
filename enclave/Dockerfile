# The gateway image that runs inside the Nitro enclave. Everything here is part of the enclave
# image hash (PCR0), and nothing here is specific to one deployment, so every deployment of the
# same commit has the same PCR0. The deployment's settings are read at boot from the Parameter
# Store parameter below and measured into PCR16, which the KMS key policy also checks.
FROM caddy:2.10.2 AS caddy

FROM oven/bun:1.4.2-slim

ENV FIDUCY_ENCLAVE_CONFIG_PARAMETER=/fiducy/enclave-config \
    FIDUCY_ENCLAVE_API_URL=http://127.0.0.1:9000 \
    FIDUCY_CADDY_CONFIG=/etc/caddy/Caddyfile \
    FIDUCY_TLS_STATE_DIR=/data/caddy \
    XDG_DATA_HOME=/data \
    XDG_CONFIG_HOME=/config \
    AWS_KMS_ENDPOINT=http://127.0.0.1:9999 \
    PORT=8787

COPY --from=caddy /usr/bin/caddy /usr/local/bin/caddy
COPY Caddyfile /etc/caddy/Caddyfile
RUN mkdir -p /data/caddy /config && chmod 700 /data /data/caddy /config

WORKDIR /app
COPY gateway.js /app/gateway.js
CMD ["bun", "/app/gateway.js"]
