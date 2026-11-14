'use client';

import { Button } from '@/components/ui/button';
import { useRevokeKey } from '@/lib/queries';

import { ConfirmAction } from './ConfirmAction';
import { ErrorAlert } from './ErrorAlert';

import type { RevokeKeyProps } from './types';

export function RevokeKey({ appID, keyID }: RevokeKeyProps) {
  const revokeKey = useRevokeKey(appID);
  return (
    <div className="grid justify-items-end gap-2">
      <ErrorAlert error={revokeKey.error} />
      <ConfirmAction
        trigger={
          <Button
            className="border-dashed"
            loading={revokeKey.isPending}
            size="xs"
            variant="outline"
          >
            Revoke
          </Button>
        }
        title="Revoke this key?"
        description="The key is deleted. The user must add it again."
        confirmLabel="Revoke key"
        onConfirm={() => revokeKey.mutate(keyID)}
      />
    </div>
  );
}
