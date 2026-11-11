# shellcheck shell=bash
# Shared by deploy.sh and pin.sh. Both run from a machine with AWS credentials, never on the host.
# Expects STACK_NAME, AWS_REGION, ROOT_DIR and TEMPLATE to be set before it is sourced.

AMI_PARAMETER=/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-arm64
BUILD_INFO_KEY=build-info.json

log() { echo "[${SCRIPT_LABEL:-aws} $(date -u +%H:%M:%S)] $*"; }
summary() { [ -n "${GITHUB_STEP_SUMMARY:-}" ] && echo "$*" >> "$GITHUB_STEP_SUMMARY" || true; }

stack_output() {
  aws cloudformation describe-stacks --stack-name "$STACK_NAME" \
    --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text
}

stack_parameter() {
  aws cloudformation describe-stacks --stack-name "$STACK_NAME" \
    --query "Stacks[0].Parameters[?ParameterKey=='$1'].ParameterValue" --output text
}

# shellcheck disable=SC2120
deploy_stack() {
  local overrides=("$@")
  if ! aws cloudformation describe-stacks --stack-name "$STACK_NAME" >/dev/null 2>&1; then
    local ami
    ami=$(aws ssm get-parameter --name "$AMI_PARAMETER" --query Parameter.Value --output text)
    overrides+=("AmiId=$ami")
    overrides+=("GitHubRepository=${FIDUCY_GITHUB_REPOSITORY:-fiducy-dev/fiducy}")
    overrides+=("GitHubOIDCProviderArn=${FIDUCY_GITHUB_OIDC_PROVIDER_ARN:-}")
    overrides+=("KeyCustodianUserArns=${FIDUCY_KEY_CUSTODIAN_USER_ARNS:?Set FIDUCY_KEY_CUSTODIAN_USER_ARNS to the IAM user ARNs (comma separated) that may pin enclave images}")
    log "Creating stack $STACK_NAME with AMI $ami"
  fi
  aws cloudformation deploy --stack-name "$STACK_NAME" --template-file "$TEMPLATE" \
    --capabilities CAPABILITY_NAMED_IAM --no-fail-on-empty-changeset \
    ${overrides[@]:+--parameter-overrides "${overrides[@]}"}
}

read_stack_outputs() {
  INSTANCE_ID=$(stack_output InstanceId)
  PUBLIC_IP=$(stack_output PublicIp)
  KEY_ARN=$(stack_output KeyArn)
  BUCKET=$(stack_output BucketName)
  KEYS_TABLE=$(stack_output KeysTableName)
  GATEWAY_HOST="gw.${PUBLIC_IP//./-}.sslip.io"
}

read_build_info() {
  aws s3 cp "s3://$BUCKET/$BUILD_INFO_KEY" - 2>/dev/null || echo '{}'
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
    --arg table "$KEYS_TABLE" --arg controlPlane "$CONTROL_PLANE_URL" \
    --arg commit "${RELEASE_COMMIT:-}" --arg pinnedPCR0 "${PINNED_PCR0:-}" '
    "export AWS_REGION=\($region) FIDUCY_BUCKET=\($bucket) FIDUCY_KMS_KEY_ID=\($key) " +
    "FIDUCY_PUBLIC_IP=\($ip) FIDUCY_KEYS_TABLE=\($table) FIDUCY_CONTROL_PLANE_URL=\($controlPlane) " +
    "FIDUCY_RELEASE_COMMIT=\($commit) FIDUCY_PINNED_PCR0=\($pinnedPCR0)"'
}

host_commands() {
  local step="$1"
  if [ "$step" = "build" ]; then
    jq -cn --argjson environment "$(host_environment)" --arg bucket "$BUCKET" '[
      "set -euo pipefail", $environment,
      "rm -rf /opt/fiducy/release && mkdir -p /opt/fiducy/release",
      "aws s3 cp --quiet s3://\($bucket)/release.tar.gz /tmp/fiducy-release.tar.gz",
      "tar -xzf /tmp/fiducy-release.tar.gz -C /opt/fiducy/release",
      "bash /opt/fiducy/release/infra/aws/parent/host.sh build"
    ]'
    return 0
  fi
  jq -cn --argjson environment "$(host_environment)" --arg step "$step" '[
    "set -euo pipefail", $environment,
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

check_gateway() {
  check_endpoint "https://${GATEWAY_HOST}/health"
  check_endpoint "https://${GATEWAY_HOST}/attestation"
}
