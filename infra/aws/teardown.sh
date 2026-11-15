#!/usr/bin/env bash
# Deletes everything the prototype created. The KMS key enters its 7 day deletion window.
set -euo pipefail

STACK_NAME="${FIDUCY_STACK_NAME:-fiducy-prototype}"
export AWS_REGION="${AWS_REGION:-us-east-1}"
export AWS_DEFAULT_REGION="$AWS_REGION"

if ! aws cloudformation describe-stacks --stack-name "$STACK_NAME" >/dev/null 2>&1; then
  echo "Stack $STACK_NAME does not exist. Nothing to delete."
  exit 0
fi

KEY_ARN=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" \
  --query "Stacks[0].Outputs[?OutputKey=='KeyArn'].OutputValue" --output text)
if [ -n "$KEY_ARN" ] && [ "$KEY_ARN" != "None" ]; then
  KEY_STATE=$(aws kms describe-key --key-id "$KEY_ARN" --query KeyMetadata.KeyState --output text)
  if [ "$KEY_STATE" != "PendingDeletion" ]; then
    echo "Refusing: the KMS key is $KEY_STATE. Deleting the stack deletes the custodian role, the only"
    echo "role that may delete the key. First, as the custodian, with MFA:"
    echo "  aws kms schedule-key-deletion --key-id $KEY_ARN --pending-window-in-days 7"
    exit 1
  fi
fi

BUCKET=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" \
  --query "Stacks[0].Outputs[?OutputKey=='BucketName'].OutputValue" --output text)
if [ -n "$BUCKET" ] && [ "$BUCKET" != "None" ]; then
  echo "Emptying s3://$BUCKET"
  aws s3 rm "s3://$BUCKET" --recursive --quiet
fi

echo "Deleting stack $STACK_NAME"
aws cloudformation delete-stack --stack-name "$STACK_NAME"
aws cloudformation wait stack-delete-complete --stack-name "$STACK_NAME"
echo "Deleted. The KMS key is pending deletion; the alert topic is kept, delete it as the root user if needed."
