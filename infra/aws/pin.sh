#!/usr/bin/env bash
# Trusts one enclave image: a key custodian runs this from their own machine, with MFA.
#   1. Check the caller is the stack's key custodian role (or the account root user)
#   2. Show what the last deploy built: commit, PCR0, the enclave config and its PCR16
#   3. Lock the KMS key to that PCR0 and PCR16 (the only way the key policy changes)
#   4. Publish the config and restart the enclave on the host with the pinned image
# Usage: pin.sh <pcr0> <pcr16>
# The deploy prints the command with both filled in. Compare them with the commit you reviewed
# and the config you expect.
set -euo pipefail

PCR0="${1:?usage: pin.sh <pcr0> <pcr16>}"
PCR16="${2:?usage: pin.sh <pcr0> <pcr16>}"
SCRIPT_LABEL=pin
STACK_NAME="${FIDUCY_STACK_NAME:-fiducy-prototype}"
export AWS_REGION="${AWS_REGION:-us-east-1}"
export AWS_DEFAULT_REGION="$AWS_REGION"
ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
TEMPLATE="$ROOT_DIR/infra/aws/stack.yaml"
CUSTODIAN_ROLE="${STACK_NAME}-key-custodian"

# shellcheck source=infra/aws/common.sh
source "$ROOT_DIR/infra/aws/common.sh"

require_custodian() {
  local caller
  caller=$(aws sts get-caller-identity --query Arn --output text)
  case "$caller" in
    *":assumed-role/${CUSTODIAN_ROLE}/"*|*":root") log "Running as $caller" ;;
    *)
      log "Refusing: $caller is not the key custodian."
      log "Only the ${CUSTODIAN_ROLE} role (assumed with MFA) or the account root user can change what the KMS key trusts."
      log "Add a profile to ~/.aws/config and run with AWS_PROFILE=fiducy-custodian:"
      log "  [profile fiducy-custodian]"
      log "  role_arn = arn:aws:iam::<account-id>:role/${CUSTODIAN_ROLE}"
      log "  source_profile = <your-iam-user-profile>"
      log "  mfa_serial = arn:aws:iam::<account-id>:mfa/<your-device>"
      return 1
      ;;
  esac
}

# The build info comes from the host, so recompute PCR16 here and compare the AWS resources with
# the stack's own outputs. Only the URLs are left for the custodian to read.
check_config() {
  local config
  config=$(echo "$1" | jq -cjS '.enclaveConfig // empty')
  [ "$(measure_config "$config")" = "$PCR16" ] || {
    log "The config shown does not measure to $PCR16. Refusing."
    return 1
  }
  echo "$config" | jq -e --arg key "$KEY_ARN" --arg table "$KEYS_TABLE" --arg region "$AWS_REGION" \
    '.kmsKeyID == $key and .keysTable == $table and .region == $region' >/dev/null || {
    log "The config names a KMS key, table or region that is not this stack's. Refusing."
    return 1
  }
}

confirm_build() {
  local build_info
  build_info=$(read_build_info)
  BUILT_PCR0=$(echo "$build_info" | jq -r '.pcr0 // empty')
  RELEASE_COMMIT=$(echo "$build_info" | jq -r '.commit // empty')
  CONTROL_PLANE_URL=$(echo "$build_info" | jq -r '.controlPlaneURL // empty')
  GATEWAY_HOST=$(echo "$build_info" | jq -r --arg fallback "$GATEWAY_HOST" '.gatewayHost // $fallback')
  local built_at
  built_at=$(echo "$build_info" | jq -r '.builtAt // "unknown"')
  local built_pcr16
  built_pcr16=$(echo "$build_info" | jq -r '.pcr16 // empty')
  if [ "$BUILT_PCR0" != "$PCR0" ] || [ "$built_pcr16" != "$PCR16" ]; then
    log "The last build on the host is ${BUILT_PCR0:-missing} with config ${built_pcr16:-missing},"
    log "not $PCR0 with $PCR16. Deploy first, then pin what it built."
    return 1
  fi
  log "Last build on the host:"
  log "  commit   $RELEASE_COMMIT"
  log "  PCR0     $BUILT_PCR0"
  log "  gateway  $GATEWAY_HOST"
  log "  built at $built_at"
  log "  PCR16    $built_pcr16, measured from this config:"
  echo "$build_info" | jq '.enclaveConfig | .gatewayTokenCiphertext |= .[0:16] + "..."' | sed 's/^/    /'
  check_config "$build_info"
  log "Check the commit is the one you reviewed on main and the URLs are yours, then type the first 8 characters of the PCR0 to trust both."
  local typed
  read -r -p "PCR0 prefix: " typed
  [ "$typed" = "${PCR0:0:8}" ] || { log "That does not match. Nothing changed."; return 1; }
}

require_custodian
read_stack_outputs
confirm_build

log "Locking the KMS key to enclave image $PCR0 with config $PCR16"
deploy_stack "EnclaveImageSha384=$PCR0" "EnclaveConfigSha384=$PCR16"
PINNED_PCR0="$PCR0"
PINNED_PCR16="$PCR16"

run_on_host pin
check_gateway
log "Trusted. The gateway at https://${GATEWAY_HOST} runs image $PCR0 from $RELEASE_COMMIT"
log "Set FIDUCY_ENCLAVE_PCR0=$PCR0 and FIDUCY_ENCLAVE_PCR16=$PCR16 in your app so the SDK and"
log "widget accept only this gateway"
