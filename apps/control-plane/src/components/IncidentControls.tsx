'use client';

import { Button } from '@/components/ui/button';
import { isSignedOut, signInAgain } from '@/lib/client';
import { useFreezeApp, useRevokeAllKeys } from '@/lib/queries';

import { ConfirmAction } from './ConfirmAction';
import { ErrorAlert } from './ErrorAlert';
import { Panel } from './Panel';

import type { AppProps } from './types';

export function IncidentControls({ app }: AppProps) {
  const freezeApp = useFreezeApp(app.appID);
  const revokeAllKeys = useRevokeAllKeys(app.appID);
  const isFrozen = app.isFrozen === true;

  function confirmRevokeAll(code: string) {
    revokeAllKeys.mutate(code, {
      onError: (error) => {
        if (isSignedOut(error)) signInAgain(app.appID);
      }
    });
  }

  return (
    <Panel
      title="If your app is breached"
      description="Freeze first. It stops every call through the gateway and keeps every user's key."
    >
      <div className="flex flex-wrap gap-2">
        {isFrozen ? (
          <Button
            variant="outline"
            size="sm"
            loading={freezeApp.isPending}
            onClick={() => freezeApp.mutate(false)}
          >
            Unfreeze app
          </Button>
        ) : (
          <ConfirmAction
            trigger={
              <Button variant="destructive" size="sm" loading={freezeApp.isPending}>
                Freeze app
              </Button>
            }
            title="Freeze this app?"
            description="The gateway refuses every AI call, key upload and import for this app until you unfreeze it. Stored keys stay as they are."
            confirmLabel="Freeze app"
            onConfirm={() => freezeApp.mutate(true)}
          />
        )}
        <ConfirmAction
          trigger={
            <Button variant="destructive-outline" size="sm" loading={revokeAllKeys.isPending}>
              Revoke all keys
            </Button>
          }
          title="Revoke every user key?"
          description="Every sealed key is deleted and every handle stops working. Each user has to connect their key again. This cannot be undone."
          confirmLabel="Revoke all keys"
          confirmPhrase={app.name}
          requiresCode
          onConfirm={confirmRevokeAll}
        />
      </div>
      {revokeAllKeys.data ? (
        <p className="text-muted-foreground text-xs">
          Revoked {revokeAllKeys.data.revokedCount} keys.
          {revokeAllKeys.data.failedCount
            ? ` ${revokeAllKeys.data.failedCount} could not be revoked. Try again.`
            : ''}
        </p>
      ) : null}
      <ErrorAlert error={freezeApp.error ?? revokeAllKeys.error} />
    </Panel>
  );
}
