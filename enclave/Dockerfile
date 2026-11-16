# The gateway image that runs inside the Nitro enclave. Everything here is part of the enclave
# image hash (PCR0), and nothing here is specific to one deployment, so every deployment of the
# same commit has the same PCR0. The deployment's settings are read at boot from the Parameter
# Store parameter below and measured into PCR16, which the KMS key policy also checks.
#
# Build it with infra/aws/enclave-build.sh, never by hand: that script pins the build platform and
# clamps every timestamp, so anyone who builds the same commit gets the same bytes and PCR0.
# Every base image is pinned by digest for the same reason. The build context is the repo root.

# The bundle is plain JavaScript and comes out byte-identical on arm64 and amd64, so this stage runs
# on the builder's own platform instead of under emulation.
FROM --platform=$BUILDPLATFORM oven/bun:1.4.2-slim@sha256:cb3bbbb08e13a4a2ff400f24c7a2a1d5efa83f6ef8544d52d95a519631e2fc61 AS bundle
WORKDIR /src
COPY . .
RUN bun install --frozen-lockfile >/dev/null \
  && bun build apps/gateway/src/server.ts --target=bun --outfile=/gateway.js

FROM --platform=$BUILDPLATFORM oven/bun:1.4.2-slim@sha256:cb3bbbb08e13a4a2ff400f24c7a2a1d5efa83f6ef8544d52d95a519631e2fc61 AS manifest
ARG FIDUCY_RELEASE_COMMIT
COPY enclave/enclaver.template.yaml /enclaver.template.yaml
RUN test -n "$FIDUCY_RELEASE_COMMIT" \
  && sed "s/\${FIDUCY_RELEASE_COMMIT}/${FIDUCY_RELEASE_COMMIT}/g" /enclaver.template.yaml > /enclaver.yaml

FROM caddy:2.10.2@sha256:c3d7ee5d2b11f9dc54f947f68a734c84e9c9666c92c88a7f30b9cba5da182adb AS caddy

FROM public.ecr.aws/s2t1d4c6/enclaver-io/odyn@sha256:76ea70290e9b42e02f21c9fbad205a23d4a77e840f41e8541708e7a1c262b8ba AS odyn

FROM oven/bun:1.4.2-slim@sha256:cb3bbbb08e13a4a2ff400f24c7a2a1d5efa83f6ef8544d52d95a519631e2fc61 AS gateway

ENV FIDUCY_ENCLAVE_CONFIG_PARAMETER=/fiducy/enclave-config \
    FIDUCY_ENCLAVE_API_URL=http://127.0.0.1:9000 \
    FIDUCY_CADDY_CONFIG=/etc/caddy/Caddyfile \
    FIDUCY_TLS_STATE_DIR=/data/caddy \
    XDG_DATA_HOME=/data \
    XDG_CONFIG_HOME=/config \
    AWS_KMS_ENDPOINT=http://127.0.0.1:9999 \
    PORT=8787

COPY --from=caddy /usr/bin/caddy /usr/local/bin/caddy
COPY --chmod=644 enclave/Caddyfile /etc/caddy/Caddyfile
RUN mkdir -p /data/caddy /config && chmod 700 /data /data/caddy /config

WORKDIR /app
COPY --from=bundle /gateway.js /app/gateway.js
CMD ["bun", "/app/gateway.js"]

# What Enclaver adds before converting the image to an EIF: its manifest and the odyn supervisor,
# which starts the gateway. Enclaver's own build stamps these files with the build time, so the
# same commit gave a different PCR0 each time; building this stage here keeps the timestamps fixed.
FROM gateway AS enclave
COPY --chown=0:0 --from=manifest /enclaver.yaml /etc/enclaver/enclaver.yaml
COPY --chown=0:0 --from=odyn /usr/local/bin/odyn /sbin/odyn
ENTRYPOINT ["/sbin/odyn", "--config-dir", "/etc/enclaver", "--", "/usr/local/bin/docker-entrypoint.sh", "bun", "/app/gateway.js"]
