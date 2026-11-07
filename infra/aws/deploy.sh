#!/usr/bin/env bash
# Deploys the gateway enclave from a machine with AWS admin credentials (GitHub Actions or a laptop).
#   1. Create or update the CloudFormation stack
#   2. Make sure the gateway token exists in Parameter Store (replace it with --rotate-token)
#   3. Remind you to give the token to the dashboard (wherever it runs)
#   4. Ship the repo to the host and build the enclave image there
#   5. Lock the KMS key to the new enclave image hash (PCR0)
#   6. Start the enclave and check the public endpoints
# Required env: FIDUCY_CONTROL_PLANE_URL. Optional: FIDUCY_DEMO_URL.
set -euo pipefail

ROTATE_TOKEN=false
for argument in "$@"; do
  case "$argument" in
    --rotate-token) ROTATE_TOKEN=true ;;
    *) echo "Unknown option $argument (expected --rotate-token)" >&2; exit 2 ;;
  esac
done

STACK_NAME="${FIDUCY_STACK_NAME:-fiducy-prototype}"
export AWS_REGION="${AWS_REGION:-us-east-1}"
export AWS_DEFAULT_REGION="$AWS_REGION"
ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
TEMPLATE="$ROOT_DIR/infra/aws/stack.yaml"
AMI_PARAMETER=/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-arm64
GATEWAY_TOKEN_PARAMETER=/fiducy/gateway-token
CONTROL_PLANE_URL="${FIDUCY_CONTROL_PLANE_URL:?Set FIDUCY_CONTROL_PLANE_URL to the dashboard URL}"

log() { echo "[deploy $(date -u +%H:%M:%S)] $*"; }
summary() { [ -n "${GITHUB_STEP_SUMMARY:-}" ] && echo "$*" >> "$GITHUB_STEP_SUMMARY" || true; }

stack_output() {
  aws cloudformation describe-stacks --stack-name "$STACK_NAME" \
    --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text
}

deploy_stack() {
  local overrides=("$@")
  if ! aws cloudformation describe-stacks --stack-name "$STACK_NAME" >/dev/null 2>&1; then
    local ami
    ami=$(aws ssm get-parameter --name "$AMI_PARAMETER" --query Parameter.Value --output text)
    overrides+=("AmiId=$ami")
    log "Creating stack $STACK_NAME with AMI $ami"
  fi
  aws cloudformation deploy --stack-name "$STACK_NAME" --template-file "$TEMPLATE" \
    --capabilities CAPABILITY_IAM --no-fail-on-empty-changeset \
    ${overrides[@]:+--parameter-overrides "${overrides[@]}"}
}

ensure_gateway_token() {
  if [ "$ROTATE_TOKEN" = false ] &&
    aws ssm get-parameter --name "$GATEWAY_TOKEN_PARAMETER" >/dev/null 2>&1; then
    return 0
  fi
  log "Writing a new gateway token to $GATEWAY_TOKEN_PARAMETER"
  aws ssm put-parameter --name "$GATEWAY_TOKEN_PARAMETER" --type SecureString --overwrite \
    --value "$(openssl rand -hex 32)" >/dev/null
}

read_gateway_token() {
  aws ssm get-parameter --name "$GATEWAY_TOKEN_PARAMETER" --with-decryption \
    --query Parameter.Value --output text
}

remind_token_handoff() {
  log "The dashboard needs this token as FIDUCY_GATEWAY_TOKEN. Read it with:"
  log "  aws ssm get-parameter --name $GATEWAY_TOKEN_PARAMETER --with-decryption --query Parameter.Value --output text"
}

wait_for_ssm() {
  log "Waiting for the host to register with SSM"
  for _ in $(seq 1 60); do
    local status
    status=$(aws ssm describe-instance-information \
      --filters "Key=InstanceIds,Values=$INSTANCE_ID" \
      --query 'InstanceInformationList[0].PingStatus' --output text 2>/dev/null || true)
    [ "$status" = "Online" ] && return 0
    sleep 10
  done
  log "The host never came online in SSM"
  return 1
}

host_environment() {
  jq -cn --arg bucket "$BUCKET" --arg key "$KEY_ARN" --arg ip "$PUBLIC_IP" --arg region "$AWS_REGION" \
    --arg table "$KEYS_TABLE" --arg controlPlane "$CONTROL_PLANE_URL" '
    "export AWS_REGION=\($region) FIDUCY_BUCKET=\($bucket) FIDUCY_KMS_KEY_ID=\($key) " +
    "FIDUCY_PUBLIC_IP=\($ip) FIDUCY_KEYS_TABLE=\($table) FIDUCY_CONTROL_PLANE_URL=\($controlPlane)"'
}

host_commands() {
  local step="$1"
  if [ "$step" = "start" ]; then
    jq -cn --argjson environment "$(host_environment)" '[
      "set -euo pipefail", $environment,
      "bash /opt/fiducy/release/infra/aws/parent/host.sh start"
    ]'
    return 0
  fi
  jq -cn --argjson environment "$(host_environment)" --arg bucket "$BUCKET" --arg step "$step" '[
    "set -euo pipefail", $environment,
    "rm -rf /opt/fiducy/release && mkdir -p /opt/fiducy/release",
    "aws s3 cp --quiet s3://\($bucket)/release.tar.gz /tmp/fiducy-release.tar.gz",
    "tar -xzf /tmp/fiducy-release.tar.gz -C /opt/fiducy/release",
    "bash /opt/fiducy/release/infra/aws/parent/host.sh \($step)"
  ]'
}

run_on_host() {
  local step="$1"
  local commands
  commands=$(host_commands "$step")

  log "Running host step: $step"
  local command_id
  command_id=$(aws ssm send-command --instance-ids "$INSTANCE_ID" --document-name AWS-RunShellScript \
    --timeout-seconds 600 --comment "fiducy $step" \
    --output-s3-bucket-name "$BUCKET" --output-s3-key-prefix "ssm-logs" \
    --parameters "{\"commands\":$commands,\"executionTimeout\":[\"3600\"]}" \
    --query Command.CommandId --output text)

  local status="InProgress"
  while [ "$status" = "InProgress" ] || [ "$status" = "Pending" ] || [ "$status" = "Delayed" ]; do
    sleep 15
    status=$(aws ssm get-command-invocation --command-id "$command_id" --instance-id "$INSTANCE_ID" \
      --query Status --output text 2>/dev/null || echo Pending)
  done

  aws ssm get-command-invocation --command-id "$command_id" --instance-id "$INSTANCE_ID" \
    --query StandardOutputContent --output text | tail -n 60
  if [ "$status" != "Success" ]; then
    log "Host step $step ended with $status. Last error output:"
    aws ssm get-command-invocation --command-id "$command_id" --instance-id "$INSTANCE_ID" \
      --query StandardErrorContent --output text | tail -n 80
    return 1
  fi
}

check_endpoint() {
  local url="$1"
  for _ in $(seq 1 40); do
    if curl -fsS --max-time 10 -o /dev/null "$url"; then
      log "OK $url"
      return 0
    fi
    sleep 6
  done
  log "Not reachable: $url"
  return 1
}

deploy_stack
INSTANCE_ID=$(stack_output InstanceId)
PUBLIC_IP=$(stack_output PublicIp)
KEY_ARN=$(stack_output KeyArn)
BUCKET=$(stack_output BucketName)
KEYS_TABLE=$(stack_output KeysTableName)
log "Host $INSTANCE_ID at $PUBLIC_IP, key $KEY_ARN"

ensure_gateway_token
remind_token_handoff

log "Uploading release"
(cd "$ROOT_DIR" && git archive --format=tar.gz -o /tmp/fiducy-release.tar.gz HEAD)
aws s3 cp --quiet /tmp/fiducy-release.tar.gz "s3://$BUCKET/release.tar.gz"

wait_for_ssm
run_on_host build
PCR0=$(aws s3 cp "s3://$BUCKET/pcr0.txt" -)
log "Locking the KMS key to enclave image $PCR0"
deploy_stack "EnclaveImageSha384=$PCR0"
run_on_host start

DASHED_IP="${PUBLIC_IP//./-}"
check_endpoint "https://gw.${DASHED_IP}.sslip.io/health"
check_endpoint "https://gw.${DASHED_IP}.sslip.io/attestation"
check_endpoint "${CONTROL_PLANE_URL}/api/config"
[ -z "${FIDUCY_DEMO_URL:-}" ] || check_endpoint "${FIDUCY_DEMO_URL}/"

summary "## Fiducy gateway deployed"
summary ""
summary "- Gateway (in the enclave): https://gw.${DASHED_IP}.sslip.io"
summary "- Dashboard: ${CONTROL_PLANE_URL}"
[ -z "${FIDUCY_DEMO_URL:-}" ] || summary "- Demo chat: ${FIDUCY_DEMO_URL}"
summary "- Site and docs: https://fiducy.dev"
summary "- Enclave image PCR0: \`${PCR0}\`"
if [ "$ROTATE_TOKEN" = true ]; then
  summary "- Gateway token rotated: set the new value as FIDUCY_GATEWAY_TOKEN on the dashboard now. Until you do, the gateway cannot load app settings from it"
fi
log "Done"
