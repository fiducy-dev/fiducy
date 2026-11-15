#!/usr/bin/env bash
# Deletes everything the prototype created: the gateway stack, then the key stack.
# The key stack goes only once a custodian has scheduled the KMS key's deletion (7 day window)
# and deleted the alert topic.
set -euo pipefail

STACK_NAME="${FIDUCY_STACK_NAME:-fiducy-prototype}"
export AWS_REGION="${AWS_REGION:-us-east-1}"
export AWS_DEFAULT_REGION="$AWS_REGION"
SCRIPT_LABEL=teardown
# shellcheck source=infra/aws/common.sh
source "$(cd "$(dirname "$0")" && pwd)/common.sh"

delete_stack() {
  log "Deleting stack $1"
  aws cloudformation delete-stack --stack-name "$1"
  aws cloudformation wait stack-delete-complete --stack-name "$1"
}

delete_gateway_stack() {
  local bucket
  bucket=$(stack_output BucketName)
  if [ -n "$bucket" ] && [ "$bucket" != "None" ]; then
    log "Emptying s3://$bucket"
    aws s3 rm "s3://$bucket" --recursive --quiet
  fi
  delete_stack "$STACK_NAME"
  success "Deleted $STACK_NAME. The key, the alert topic and the audit trail stay in $KEY_STACK_NAME."
}

# What only the custodian may do, and so has to happen before the custodian role is deleted.
custodian_steps_left() {
  local key_arn="$1" topic_arn="$2" key_state
  key_state=$(aws kms describe-key --key-id "$key_arn" --query KeyMetadata.KeyState --output text)
  [ "$key_state" = "PendingDeletion" ] ||
    echo "aws kms schedule-key-deletion --key-id $key_arn --pending-window-in-days 7"
  if [ -n "$topic_arn" ] && aws sns get-topic-attributes --topic-arn "$topic_arn" >/dev/null 2>&1; then
    echo "aws sns delete-topic --topic-arn $topic_arn"
  fi
}

delete_key_stack() {
  local key_arn topic_arn steps
  key_arn=$(stack_output KeyArn "$KEY_STACK_NAME")
  topic_arn=$(alert_topic_arn)
  steps=$(custodian_steps_left "$key_arn" "$topic_arn")
  if [ -n "$steps" ]; then
    fail "Keeping $KEY_STACK_NAME: deleting it deletes the custodian role, the only role that may"
    fail "delete the KMS key and the alert topic."
    local commands
    mapfile -t commands <<< "$steps"
    action "First, as the custodian, with MFA, then run teardown.sh again:" "${commands[@]}"
    return 1
  fi
  delete_stack "$KEY_STACK_NAME"
  success "Deleted $KEY_STACK_NAME. The KMS key is pending deletion; the audit log bucket is kept."
}

if stack_exists "$STACK_NAME"; then
  delete_gateway_stack
else
  log "Stack $STACK_NAME does not exist."
fi
if stack_exists "$KEY_STACK_NAME"; then
  delete_key_stack
else
  log "Stack $KEY_STACK_NAME does not exist."
fi
