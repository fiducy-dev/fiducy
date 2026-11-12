#!/usr/bin/env bash
# Runs on the parent EC2 host through SSM. Two steps:
#   host.sh build  -> install tools, bundle the gateway, build the enclave image tagged with the
#                     release commit, write this deployment's enclave config, record PCR0 (the
#                     image) and PCR16 (the config). The running enclave is left alone.
#   host.sh pin    -> check the last build and config are what the KMS key trusts
#                     (FIDUCY_PINNED_PCR0, FIDUCY_PINNED_PCR16), publish the config to Parameter
#                     Store, then (re)start the enclave. The enclave terminates TLS itself.
# Required env: AWS_REGION, FIDUCY_BUCKET, FIDUCY_KMS_KEY_ID, FIDUCY_KEYS_TABLE, FIDUCY_PUBLIC_IP,
#               FIDUCY_CONTROL_PLANE_URL, FIDUCY_RELEASE_COMMIT (build),
#               FIDUCY_PINNED_PCR0 and FIDUCY_PINNED_PCR16 (pin)
# Optional env: FIDUCY_GATEWAY_HOST, a domain whose A record points at the Elastic IP
#               (default gw.<dashed-ip>.sslip.io). It is part of the config, so it changes PCR16.
# The dashboard and the demo run elsewhere, so the host only runs the gateway enclave. TLS ends
# inside the enclave, so the parent never holds a certificate key or sees plaintext traffic.
set -euo pipefail

STEP="${1:?usage: host.sh build|pin}"
RELEASE_DIR=/opt/fiducy/release
STATE_DIR=/var/lib/fiducy
BUILD_INFO_FILE="$STATE_DIR/build-info.json"
PINNED_IMAGE_FILE="$STATE_DIR/pinned-image"
ENCLAVE_CONFIG_FILE="$STATE_DIR/enclave-config.json"
ENCLAVE_CONFIG_PARAMETER=/fiducy/enclave-config
BUN_VERSION=1.4.2
ENCLAVER_VERSION=0.6.1
ENCLAVER_SHA256=aac505a98438e399e042d0be9dc1bc8bff4b02beee3eb149e5301af6a289730f
ENCLAVE_CPU_COUNT=1
ENCLAVE_MEMORY_MB=1536
GATEWAY_TOKEN_PARAMETER=/fiducy/gateway-token
DASHED_IP="${FIDUCY_PUBLIC_IP//./-}"
GATEWAY_HOST="${FIDUCY_GATEWAY_HOST:-gw.${DASHED_IP}.sslip.io}"
CONTROL_PLANE_URL="${FIDUCY_CONTROL_PLANE_URL:?Set FIDUCY_CONTROL_PLANE_URL to the dashboard URL}"

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

# The enclave extends PCR16 once with the SHA-384 of the exact config bytes it reads, starting
# from 48 zero bytes, so PCR16 = SHA-384(zeros || SHA-384(config)).
measure_config() {
  { head -c 48 /dev/zero; openssl dgst -sha384 -binary "$1"; } | openssl dgst -sha384 -r | cut -d' ' -f1
}

write_enclave_config() {
  local token_ciphertext="$1"
  printf '%s' "$(jq -cnS --arg controlPlaneURL "$CONTROL_PLANE_URL" \
    --arg gatewayTokenCiphertext "$token_ciphertext" --arg keysTable "$FIDUCY_KEYS_TABLE" \
    --arg kmsKeyID "$FIDUCY_KMS_KEY_ID" --arg publicHost "$GATEWAY_HOST" --arg region "$AWS_REGION" \
    '$ARGS.named')" > "$ENCLAVE_CONFIG_FILE"
}

record_build() {
  local commit="$1" pcr0 pcr16
  pcr0=$(jq -r '.Measurements.PCR0' "$STATE_DIR/enclave-build.json")
  pcr16=$(measure_config "$ENCLAVE_CONFIG_FILE")
  jq -n --arg pcr0 "$pcr0" --arg pcr16 "$pcr16" --arg commit "$commit" \
    --arg image "fiducy-enclave:${commit}" --arg builtAt "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --slurpfile config "$ENCLAVE_CONFIG_FILE" \
    '{pcr0: $pcr0, pcr16: $pcr16, commit: $commit, imageTag: $image, builtAt: $builtAt,
      controlPlaneURL: $config[0].controlPlaneURL, gatewayHost: $config[0].publicHost,
      enclaveConfig: $config[0]}' > "$BUILD_INFO_FILE"
  aws s3 cp --quiet "$BUILD_INFO_FILE" "s3://${FIDUCY_BUCKET}/build-info.json"
  aws s3 cp --quiet "$STATE_DIR/enclave-build.json" "s3://${FIDUCY_BUCKET}/enclave-build.json"
  log "Enclave image PCR0: $pcr0"
  log "Enclave config PCR16: $pcr16"
}

build_release() {
  local commit="${FIDUCY_RELEASE_COMMIT:?Set FIDUCY_RELEASE_COMMIT to the commit being built}"
  log "Installing dependencies"
  cd "$RELEASE_DIR"
  bun install --frozen-lockfile >/dev/null

  log "Bundling the gateway"
  bun build apps/gateway/src/server.ts --target=bun --outfile=enclave/gateway.js >/dev/null

  log "Building the enclave image for commit $commit"
  docker build -q -t "fiducy-gateway-app:${commit}" enclave >/dev/null
  export FIDUCY_RELEASE_COMMIT
  # shellcheck disable=SC2016
  envsubst '${FIDUCY_RELEASE_COMMIT}' < enclave/enclaver.template.yaml > enclave/enclaver.yaml
  (cd enclave && enclaver build -f enclaver.yaml > "$STATE_DIR/enclave-build.json")

  log "Sealing the gateway token and writing the enclave config"
  local token_ciphertext
  token_ciphertext=$(seal_gateway_token)
  write_enclave_config "$token_ciphertext"
  record_build "$commit"
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
  local pinned_pcr16="${FIDUCY_PINNED_PCR16:?Set FIDUCY_PINNED_PCR16 to the PCR16 the KMS key trusts}"
  [ -f "$BUILD_INFO_FILE" ] || { log "Nothing has been built on this host yet"; return 1; }
  local built_pcr0 built_pcr16 image
  built_pcr0=$(jq -r '.pcr0' "$BUILD_INFO_FILE")
  built_pcr16=$(measure_config "$ENCLAVE_CONFIG_FILE")
  image=$(jq -r '.imageTag' "$BUILD_INFO_FILE")
  if [ "$built_pcr0" != "$pinned_pcr0" ] || [ "$built_pcr16" != "$pinned_pcr16" ]; then
    log "The last build is $built_pcr0 with config $built_pcr16."
    log "The KMS key trusts $pinned_pcr0 with config $pinned_pcr16. Refusing to start it."
    return 1
  fi
  aws ssm put-parameter --region "$AWS_REGION" --name "$ENCLAVE_CONFIG_PARAMETER" --type String \
    --overwrite --value "file://${ENCLAVE_CONFIG_FILE}" >/dev/null
  printf '%s' "$image" > "$PINNED_IMAGE_FILE"
  log "Pinned $image ($built_pcr0) with config $built_pcr16"
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
