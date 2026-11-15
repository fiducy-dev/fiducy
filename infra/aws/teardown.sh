#!/usr/bin/env bash
# Deletes everything the prototype created: the gateway stack, then the key stack.
# The key stack goes only once a custodian has scheduled the KMS key's deletion (7 day window).
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
  success "Deleted $STACK_NAME. The alert topic and its policy are kept (they cost nothing; only the root user may delete them)."
}

delete_key_stack() {
  local key_arn key_state
  key_arn=$(stack_output KeyArn "$KEY_STACK_NAME")
  key_state=$(aws kms describe-key --key-id "$key_arn" --query KeyMetadata.KeyState --output text)
  if [ "$key_state" != "PendingDeletion" ]; then
    fail "Keeping $KEY_STACK_NAME: the KMS key is $key_state. Deleting the stack deletes the custodian"
    fail "role, the only role that may delete the key."
    action "First, as the custodian, with MFA, then run teardown.sh again:" \
      "aws kms schedule-key-deletion --key-id $key_arn --pending-window-in-days 7"
    return 1
  fi
  delete_stack "$KEY_STACK_NAME"
  success "Deleted $KEY_STACK_NAME. The KMS key is pending deletion."
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
