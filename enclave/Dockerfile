# The gateway image that runs inside the Nitro enclave. Everything here, including the build
# arguments, is part of the enclave image hash (PCR0) that the KMS key policy checks.
FROM caddy:2.10.2 AS caddy

FROM oven/bun:1.4.2-slim

ARG FIDUCY_KMS_KEY_ID
ARG FIDUCY_KEYS_TABLE
ARG FIDUCY_CONTROL_PLANE_URL
ARG FIDUCY_GATEWAY_TOKEN_CIPHERTEXT
ARG FIDUCY_PUBLIC_HOST
ARG AWS_REGION

ENV FIDUCY_KMS_KEY_ID=${FIDUCY_KMS_KEY_ID} \
    FIDUCY_KEYS_TABLE=${FIDUCY_KEYS_TABLE} \
    FIDUCY_CONTROL_PLANE_URL=${FIDUCY_CONTROL_PLANE_URL} \
    FIDUCY_GATEWAY_TOKEN_CIPHERTEXT=${FIDUCY_GATEWAY_TOKEN_CIPHERTEXT} \
    FIDUCY_PUBLIC_HOST=${FIDUCY_PUBLIC_HOST} \
    FIDUCY_ENCLAVE_API_URL=http://127.0.0.1:9000 \
    FIDUCY_CADDY_CONFIG=/etc/caddy/Caddyfile \
    FIDUCY_TLS_STATE_DIR=/data/caddy \
    XDG_DATA_HOME=/data \
    XDG_CONFIG_HOME=/config \
    AWS_KMS_ENDPOINT=http://127.0.0.1:9999 \
    AWS_REGION=${AWS_REGION} \
    PORT=8787

COPY --from=caddy /usr/bin/caddy /usr/local/bin/caddy
COPY Caddyfile /etc/caddy/Caddyfile
RUN mkdir -p /data/caddy /config && chmod 700 /data /data/caddy /config

WORKDIR /app
COPY gateway.js /app/gateway.js
CMD ["bun", "/app/gateway.js"]
