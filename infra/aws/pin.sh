#!/usr/bin/env bash
# Trusts one enclave image: a key custodian runs this from their own machine, with MFA.
#   1. Check the caller is the stack's key custodian role (or the account root user)
#   2. Show what the last deploy built: commit, PCR0 and build time
#   3. Lock the KMS key to that PCR0 (the only way the key policy changes)
#   4. Restart the enclave on the host with the pinned image
# Usage: pin.sh <pcr0>
# The deploy prints the command with the PCR0 filled in. Compare it with the commit you reviewed.
set -euo pipefail

PCR0="${1:?usage: pin.sh <pcr0>}"
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

confirm_build() {
  local build_info
  build_info=$(read_build_info)
  BUILT_PCR0=$(echo "$build_info" | jq -r '.pcr0 // empty')
  RELEASE_COMMIT=$(echo "$build_info" | jq -r '.commit // empty')
  CONTROL_PLANE_URL=$(echo "$build_info" | jq -r '.controlPlaneURL // empty')
  GATEWAY_HOST=$(echo "$build_info" | jq -r --arg fallback "$GATEWAY_HOST" '.gatewayHost // $fallback')
  local built_at
  built_at=$(echo "$build_info" | jq -r '.builtAt // "unknown"')
  if [ "$BUILT_PCR0" != "$PCR0" ]; then
    log "The last build on the host is ${BUILT_PCR0:-missing}, not $PCR0. Deploy first, then pin what it built."
    return 1
  fi
  log "Last build on the host:"
  log "  commit   $RELEASE_COMMIT"
  log "  PCR0     $BUILT_PCR0"
  log "  gateway  $GATEWAY_HOST"
  log "  built at $built_at"
  log "Check that the commit is the one you reviewed on main, then type the first 8 characters of the PCR0 to trust it."
  local typed
  read -r -p "PCR0 prefix: " typed
  [ "$typed" = "${PCR0:0:8}" ] || { log "That does not match. Nothing changed."; return 1; }
}

require_custodian
read_stack_outputs
confirm_build

log "Locking the KMS key to enclave image $PCR0"
deploy_stack "EnclaveImageSha384=$PCR0"
PINNED_PCR0="$PCR0"

run_on_host pin
check_gateway
log "Trusted. The gateway at https://${GATEWAY_HOST} runs image $PCR0 from $RELEASE_COMMIT"
log "Set FIDUCY_ENCLAVE_PCR0=$PCR0 in your app so the SDK and widget accept this gateway"
