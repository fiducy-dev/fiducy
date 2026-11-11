#!/usr/bin/env bash
# Runs on the parent EC2 host through SSM. Two steps:
#   host.sh build  -> install tools, bundle the gateway, build the enclave image tagged with the
#                     release commit, record its PCR0. The running enclave is left alone.
#   host.sh pin    -> check the last build is the image the KMS key trusts (FIDUCY_PINNED_PCR0),
#                     then (re)start the enclave on it. The enclave terminates TLS itself.
# Required env: AWS_REGION, FIDUCY_BUCKET, FIDUCY_KMS_KEY_ID, FIDUCY_KEYS_TABLE, FIDUCY_PUBLIC_IP,
#               FIDUCY_CONTROL_PLANE_URL, FIDUCY_RELEASE_COMMIT (build), FIDUCY_PINNED_PCR0 (pin)
# The dashboard and the demo run elsewhere, so the host only runs the gateway enclave. TLS ends
# inside the enclave, so the parent never holds a certificate key or sees plaintext traffic.
set -euo pipefail

STEP="${1:?usage: host.sh build|pin}"
RELEASE_DIR=/opt/fiducy/release
STATE_DIR=/var/lib/fiducy
BUILD_INFO_FILE="$STATE_DIR/build-info.json"
PINNED_IMAGE_FILE="$STATE_DIR/pinned-image"
BUN_VERSION=1.4.2
ENCLAVER_VERSION=0.6.1
ENCLAVER_SHA256=aac505a98438e399e042d0be9dc1bc8bff4b02beee3eb149e5301af6a289730f
ENCLAVE_CPU_COUNT=1
ENCLAVE_MEMORY_MB=1536
GATEWAY_TOKEN_PARAMETER=/fiducy/gateway-token
DASHED_IP="${FIDUCY_PUBLIC_IP//./-}"
GATEWAY_HOST="gw.${DASHED_IP}.sslip.io"
CONTROL_PLANE_URL="${FIDUCY_CONTROL_PLANE_URL:?Set FIDUCY_CONTROL_PLANE_URL to the dashboard URL}"
CONTROL_PLANE_HOST="${CONTROL_PLANE_URL#https://}"
CONTROL_PLANE_HOST="${CONTROL_PLANE_HOST%%/*}"

export PATH="/usr/local/bin:$PATH"
export HOME=/root

log() { echo "[fiducy $(date -u +%H:%M:%S)] $*"; }

install_tools() {
  if [ ! -f "$STATE_DIR/tools-installed" ]; then
    log "Installing packages"
    dnf install -y -q docker aws-nitro-enclaves-cli aws-nitro-enclaves-cli-devel jq unzip tar gzip gettext
    mkdir -p "$STATE_DIR"
    touch "$STATE_DIR/tools-installed"
  fi

  if ! swapon --show | grep -q /swapfile; then
    log "Adding 2 GB of swap for builds"
    [ -f /swapfile ] || { dd if=/dev/zero of=/swapfile bs=1M count=2048 status=none; chmod 600 /swapfile; mkswap /swapfile >/dev/null; }
    swapon /swapfile
  fi

  if [ ! -x /usr/local/bin/bun ] || [ "$(/usr/local/bin/bun --version)" != "$BUN_VERSION" ]; then
    log "Installing Bun $BUN_VERSION"
    curl -fsSL -o /tmp/bun.zip "https://github.com/oven-sh/bun/releases/download/bun-v${BUN_VERSION}/bun-linux-aarch64.zip"
    unzip -oq /tmp/bun.zip -d /tmp/bun
    install -m 755 /tmp/bun/bun-linux-aarch64/bun /usr/local/bin/bun
    ln -sf /usr/local/bin/bun /usr/local/bin/bunx
  fi

  if [ ! -x /usr/local/bin/enclaver ]; then
    log "Installing Enclaver $ENCLAVER_VERSION"
    curl -fsSL -o /tmp/enclaver.tgz "https://github.com/enclaver-io/enclaver/releases/download/v${ENCLAVER_VERSION}/enclaver-linux-aarch64-v${ENCLAVER_VERSION}.tar.gz"
    echo "${ENCLAVER_SHA256}  /tmp/enclaver.tgz" | sha256sum -c -
    tar -xzf /tmp/enclaver.tgz -C /tmp
    install -m 755 "/tmp/enclaver-linux-aarch64-v${ENCLAVER_VERSION}/enclaver" /usr/local/bin/enclaver
  fi

  cat > /etc/nitro_enclaves/allocator.yaml <<EOF
---
memory_mib: ${ENCLAVE_MEMORY_MB}
cpu_count: ${ENCLAVE_CPU_COUNT}
EOF
  systemctl enable --now docker >/dev/null
  systemctl enable nitro-enclaves-allocator >/dev/null
  systemctl restart nitro-enclaves-allocator
}

read_parameter() {
  aws ssm get-parameter --region "$AWS_REGION" --name "$1" --with-decryption \
    --query Parameter.Value --output text
}

seal_gateway_token() {
  local token_file
  token_file=$(mktemp)
  read_parameter "$GATEWAY_TOKEN_PARAMETER" | tr -d '\n' > "$token_file"
  [ -s "$token_file" ] || { log "No gateway token in ${GATEWAY_TOKEN_PARAMETER}"; return 1; }
  aws kms encrypt --region "$AWS_REGION" --key-id "$FIDUCY_KMS_KEY_ID" \
    --plaintext "fileb://${token_file}" --encryption-context fiducyPurpose=gateway-token \
    --query CiphertextBlob --output text
  rm -f "$token_file"
}

build_release() {
  local commit="${FIDUCY_RELEASE_COMMIT:?Set FIDUCY_RELEASE_COMMIT to the commit being built}"
  log "Installing dependencies"
  cd "$RELEASE_DIR"
  bun install --frozen-lockfile >/dev/null

  log "Bundling the gateway"
  bun build apps/gateway/src/server.ts --target=bun --outfile=enclave/gateway.js >/dev/null

  log "Sealing the gateway token for the enclave"
  local token_ciphertext
  token_ciphertext=$(seal_gateway_token)

  log "Building the enclave image for commit $commit"
  docker build -q -t "fiducy-gateway-app:${commit}" \
    --build-arg FIDUCY_KMS_KEY_ID="$FIDUCY_KMS_KEY_ID" \
    --build-arg FIDUCY_KEYS_TABLE="$FIDUCY_KEYS_TABLE" \
    --build-arg FIDUCY_CONTROL_PLANE_URL="$CONTROL_PLANE_URL" \
    --build-arg FIDUCY_GATEWAY_TOKEN_CIPHERTEXT="$token_ciphertext" \
    --build-arg FIDUCY_PUBLIC_HOST="$GATEWAY_HOST" \
    --build-arg AWS_REGION="$AWS_REGION" \
    enclave >/dev/null

  export ENCLAVE_CPU_COUNT ENCLAVE_MEMORY_MB AWS_REGION CONTROL_PLANE_HOST FIDUCY_RELEASE_COMMIT
  envsubst < enclave/enclaver.template.yaml > enclave/enclaver.yaml
  (cd enclave && enclaver build -f enclaver.yaml > "$STATE_DIR/enclave-build.json")

  local pcr0
  pcr0=$(jq -r '.Measurements.PCR0' "$STATE_DIR/enclave-build.json")
  jq -n --arg pcr0 "$pcr0" --arg commit "$commit" --arg image "fiducy-enclave:${commit}" \
    --arg builtAt "$(date -u +%Y-%m-%dT%H:%M:%SZ)" --arg controlPlane "$CONTROL_PLANE_URL" \
    '{pcr0: $pcr0, commit: $commit, imageTag: $image, builtAt: $builtAt, controlPlaneURL: $controlPlane}' \
    > "$BUILD_INFO_FILE"
  aws s3 cp --quiet "$BUILD_INFO_FILE" "s3://${FIDUCY_BUCKET}/build-info.json"
  aws s3 cp --quiet "$STATE_DIR/enclave-build.json" "s3://${FIDUCY_BUCKET}/enclave-build.json"
  log "Enclave PCR0: $pcr0"
}

# The unit only ever runs the image recorded in the pinned-image file, so a restart after a build
# that nobody trusted yet keeps the previous image.
write_units() {
  local image="$1"
  mkdir -p /etc/fiducy
  cat > /etc/systemd/system/fiducy-enclave.service <<EOF
[Unit]
Description=Fiducy gateway inside a Nitro enclave (via Enclaver)
After=docker.service nitro-enclaves-allocator.service
Requires=docker.service
[Service]
ExecStartPre=-/usr/bin/docker rm -f fiducy-enclave
ExecStart=/usr/bin/docker run --rm --name fiducy-enclave --privileged --device /dev/nitro_enclaves -p 443:443 -p 80:80 ${image}
ExecStop=/usr/bin/docker stop fiducy-enclave
Restart=always
RestartSec=5
[Install]
WantedBy=multi-user.target
EOF
  systemctl daemon-reload
}

retire_host_apps() {
  local unit
  for unit in fiducy-control-plane fiducy-demo fiducy-caddy postgresql; do
    systemctl disable --now "$unit" >/dev/null 2>&1 || true
  done
  rm -f /etc/systemd/system/fiducy-control-plane.service /etc/systemd/system/fiducy-demo.service
  rm -f /etc/systemd/system/fiducy-caddy.service /etc/fiducy/Caddyfile
  rm -f /etc/fiducy/control-plane.env /etc/fiducy/demo.env
}

wait_for_gateway() {
  local url="https://${GATEWAY_HOST}/health"
  for _ in $(seq 1 150); do
    curl -fsS -o /dev/null --resolve "${GATEWAY_HOST}:443:127.0.0.1" "$url" && return 0
    sleep 2
  done
  log "The enclave gateway did not come up at $url. Last lines from the enclave:"
  docker logs --tail 50 fiducy-enclave 2>&1 | sed 's/^/    /' || true
  return 1
}

pin_last_build() {
  local pinned_pcr0="${FIDUCY_PINNED_PCR0:?Set FIDUCY_PINNED_PCR0 to the PCR0 the KMS key trusts}"
  [ -f "$BUILD_INFO_FILE" ] || { log "Nothing has been built on this host yet"; return 1; }
  local built_pcr0 image
  built_pcr0=$(jq -r '.pcr0' "$BUILD_INFO_FILE")
  image=$(jq -r '.imageTag' "$BUILD_INFO_FILE")
  if [ "$built_pcr0" != "$pinned_pcr0" ]; then
    log "The last build is $built_pcr0 but the KMS key trusts $pinned_pcr0. Refusing to start it."
    return 1
  fi
  printf '%s' "$image" > "$PINNED_IMAGE_FILE"
  log "Pinned $image ($built_pcr0)"
}

start_services() {
  [ -f "$PINNED_IMAGE_FILE" ] || { log "No pinned image. Run infra/aws/pin.sh first."; return 1; }
  retire_host_apps
  write_units "$(cat "$PINNED_IMAGE_FILE")"
  systemctl enable fiducy-enclave >/dev/null
  systemctl restart fiducy-enclave
  wait_for_gateway
  log "Gateway:  https://${GATEWAY_HOST}"
  log "Console:  ${CONTROL_PLANE_URL}"
}

install_tools
case "$STEP" in
  build) build_release ;;
  pin) pin_last_build && start_services ;;
  *) echo "Unknown step $STEP" >&2; exit 2 ;;
esac
