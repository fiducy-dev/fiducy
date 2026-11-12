#!/usr/bin/env bash
# Deploys the gateway host from a machine with AWS credentials (GitHub Actions or a laptop).
#   1. Create or update the CloudFormation stack
#   2. Make sure the gateway token exists in Parameter Store (replace it with --rotate-token)
#   3. Remind you to give the token to the dashboard (wherever it runs)
#   4. Ship the repo to the host and build the enclave image there
#   5. If the image hash (PCR0) and config hash (PCR16) are the ones the KMS key already trusts,
#      start it. Otherwise stop and print the pin.sh command. Trusting is a human step with MFA.
# Required env: FIDUCY_CONTROL_PLANE_URL. Optional: FIDUCY_DEMO_URL.
set -euo pipefail

ROTATE_TOKEN=false
for argument in "$@"; do
  case "$argument" in
    --rotate-token) ROTATE_TOKEN=true ;;
    *) echo "Unknown option $argument (expected --rotate-token)" >&2; exit 2 ;;
  esac
done

SCRIPT_LABEL=deploy
STACK_NAME="${FIDUCY_STACK_NAME:-fiducy-prototype}"
export AWS_REGION="${AWS_REGION:-us-east-1}"
export AWS_DEFAULT_REGION="$AWS_REGION"
ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
TEMPLATE="$ROOT_DIR/infra/aws/stack.yaml"
GATEWAY_TOKEN_PARAMETER=/fiducy/gateway-token
CONTROL_PLANE_URL="${FIDUCY_CONTROL_PLANE_URL:?Set FIDUCY_CONTROL_PLANE_URL to the dashboard URL}"
RELEASE_COMMIT=$(git -C "$ROOT_DIR" rev-parse HEAD)

# shellcheck source=infra/aws/common.sh
source "$ROOT_DIR/infra/aws/common.sh"

ensure_gateway_token() {
  if [ "$ROTATE_TOKEN" = false ] &&
    aws ssm get-parameter --name "$GATEWAY_TOKEN_PARAMETER" >/dev/null 2>&1; then
    return 0
  fi
  log "Writing a new gateway token to $GATEWAY_TOKEN_PARAMETER"
  aws ssm put-parameter --name "$GATEWAY_TOKEN_PARAMETER" --type SecureString --overwrite \
    --value "$(openssl rand -hex 32)" >/dev/null
}

remind_token_handoff() {
  log "The dashboard needs this token as FIDUCY_GATEWAY_TOKEN. Read it with:"
  log "  aws ssm get-parameter --name $GATEWAY_TOKEN_PARAMETER --with-decryption --query Parameter.Value --output text"
}

upload_release() {
  log "Uploading release $RELEASE_COMMIT"
  (cd "$ROOT_DIR" && git archive --format=tar.gz -o /tmp/fiducy-release.tar.gz HEAD)
  aws s3 cp --quiet /tmp/fiducy-release.tar.gz "s3://$BUCKET/release.tar.gz"
}

print_pin_instructions() {
  log "The KMS key trusts image ${PINNED_PCR0:-nothing yet} with config ${PINNED_PCR16:-nothing yet},"
  log "so this build cannot open any key. Nothing was restarted; the running enclave keeps running."
  log "To trust it, a key custodian runs this from their own machine with MFA:"
  log "  bash infra/aws/pin.sh $BUILT_PCR0 $BUILT_PCR16"
  summary "## Enclave built, not yet trusted"
  summary ""
  summary "- Commit: \`${RELEASE_COMMIT}\`"
  summary "- Enclave image PCR0: \`${BUILT_PCR0}\`"
  summary "- Enclave config PCR16: \`${BUILT_PCR16}\`"
  summary "- The KMS key still trusts: \`${PINNED_PCR0:-nothing}\` with \`${PINNED_PCR16:-nothing}\`"
  summary "- A key custodian trusts it with: \`bash infra/aws/pin.sh ${BUILT_PCR0} ${BUILT_PCR16}\`"
}

print_deploy_summary() {
  summary "## Fiducy gateway deployed"
  summary ""
  summary "- Commit: \`${RELEASE_COMMIT}\`"
  summary "- Gateway (in the enclave): https://${GATEWAY_HOST}"
  summary "- Dashboard: ${CONTROL_PLANE_URL}"
  [ -z "${FIDUCY_DEMO_URL:-}" ] || summary "- Demo chat: ${FIDUCY_DEMO_URL}"
  summary "- Site and docs: https://fiducy.dev"
  summary "- Enclave image PCR0: \`${BUILT_PCR0}\`"
  summary "- Enclave config PCR16: \`${BUILT_PCR16}\`"
  if [ "$ROTATE_TOKEN" = true ]; then
    summary "- Gateway token rotated: set the new value as FIDUCY_GATEWAY_TOKEN on the dashboard now. Until you do, the gateway cannot load app settings from it"
  fi
}

# shellcheck disable=SC2119
deploy_stack
read_stack_outputs
log "Host $INSTANCE_ID at $PUBLIC_IP, key $KEY_ARN"

ensure_gateway_token
remind_token_handoff
upload_release

wait_for_ssm
run_on_host build
BUILD_INFO=$(read_build_info)
BUILT_PCR0=$(echo "$BUILD_INFO" | jq -r '.pcr0 // empty')
BUILT_PCR16=$(echo "$BUILD_INFO" | jq -r '.pcr16 // empty')
[ -n "$BUILT_PCR0" ] && [ -n "$BUILT_PCR16" ] || { log "The host did not record a build"; exit 1; }
PINNED_PCR0=$(stack_parameter EnclaveImageSha384)
PINNED_PCR16=$(stack_parameter EnclaveConfigSha384)
[ "$PINNED_PCR0" != "none" ] || PINNED_PCR0=""
[ "$PINNED_PCR16" != "none" ] || PINNED_PCR16=""
log "Built enclave image $BUILT_PCR0 with config $BUILT_PCR16 from $RELEASE_COMMIT"

if [ "$BUILT_PCR0" != "$PINNED_PCR0" ] || [ "$BUILT_PCR16" != "$PINNED_PCR16" ]; then
  print_pin_instructions
  exit 0
fi

run_on_host pin
check_gateway
check_endpoint "${CONTROL_PLANE_URL}/api/config"
[ -z "${FIDUCY_DEMO_URL:-}" ] || check_endpoint "${FIDUCY_DEMO_URL}/"
print_deploy_summary
log "Done"
