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

  function confirmDelete(code: string) {
    deleteApp.mutate(code, {
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
      description="Rotating breaks servers still using the old secret. Deleting breaks every stored key handle."
    >
      <div className="flex flex-wrap gap-2">
        <ConfirmAction
          trigger={
            <Button variant="outline" size="sm" loading={rotateSecret.isPending}>
              Rotate app secret
            </Button>
          }
          title="Rotate the app secret?"
          description="Your servers must switch to the new secret. The old one stops working shortly."
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
          description="Every user key handle it holds stops working. This cannot be undone."
          confirmLabel="Delete app"
          confirmPhrase={appName}
          requiresCode
          onConfirm={confirmDelete}
        />
      </div>
      {rotateSecret.data ? <SecretReveal appSecret={rotateSecret.data.appSecret} /> : null}
      <ErrorAlert error={rotateSecret.error ?? deleteApp.error} />
    </Panel>
  );
}
