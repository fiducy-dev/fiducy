'use client';

import { Button } from '@/components/ui/button';
import { isSignedOut, signInAgain } from '@/lib/client';
import { useDeleteApp, useRotateSecret } from '@/lib/queries';

import { ConfirmAction } from './ConfirmAction';
import { ErrorAlert } from './ErrorAlert';
import { Panel } from './Panel';
import { SecretReveal } from './SecretReveal';

import type { DangerZoneProps } from './types';

export function DangerZone({ appID, appName }: DangerZoneProps) {
  const rotateSecret = useRotateSecret(appID);
  const deleteApp = useDeleteApp(appID);

  function confirmDelete() {
    deleteApp.mutate(undefined, {
      onSuccess: () => {
        window.location.href = '/dashboard';
      },
      onError: (error) => {
        if (isSignedOut(error)) signInAgain(appID);
      }
    });
  }

  return (
    <Panel
      collapsible
      defaultOpen={false}
      className="border-dashed"
      title="Secret and removal"
      description="Rotating ends the old secret. Deleting ends every key handle."
    >
      <div className="flex flex-wrap gap-2">
        <ConfirmAction
          trigger={
            <Button variant="outline" size="sm" loading={rotateSecret.isPending}>
              Rotate app secret
            </Button>
          }
          title="Rotate the app secret?"
          description="Update your servers. The old secret stops working shortly."
          confirmLabel="Rotate secret"
          onConfirm={() => rotateSecret.mutate()}
        />
        <ConfirmAction
          trigger={
            <Button variant="destructive-outline" size="sm" loading={deleteApp.isPending}>
              Delete app
            </Button>
          }
          title="Delete this app?"
          description="Every key handle stops working. This cannot be undone."
          confirmLabel="Delete app"
          confirmPhrase={appName}
          onConfirm={confirmDelete}
        />
      </div>
      {rotateSecret.data ? <SecretReveal appSecret={rotateSecret.data.appSecret} /> : null}
      <ErrorAlert error={rotateSecret.error ?? deleteApp.error} />
    </Panel>
  );
}
