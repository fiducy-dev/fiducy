'use client';

import { Button } from '@/components/ui/button';
import { isSignedOut, signInAgain } from '@/lib/client';
import { useStartTwoFactor, useTwoFactorStatus } from '@/lib/twoFactorQueries';

import { ErrorAlert } from './ErrorAlert';
import { Panel } from './Panel';
import { TwoFactorEnrollment } from './TwoFactorEnrollment';

import type { TwoFactorPanelProps } from './types';

export function TwoFactorPanel({ appID }: TwoFactorPanelProps) {
  const status = useTwoFactorStatus();
  const startTwoFactor = useStartTwoFactor();
  const isEnabled = status.data?.isEnabled === true;

  function start() {
    startTwoFactor.mutate(undefined, {
      onError: (error) => {
        if (isSignedOut(error)) signInAgain(appID);
      }
    });
  }

  return (
    <Panel
      title="Two-factor"
      description={
        isEnabled
          ? 'On. Revoking all keys or deleting an app asks for a code.'
          : 'Required to revoke all keys or delete an app.'
      }
    >
      {status.data && !isEnabled && !startTwoFactor.data ? (
        <Button
          className="justify-self-start"
          variant="outline"
          size="sm"
          loading={startTwoFactor.isPending}
          onClick={start}
        >
          Set up two-factor
        </Button>
      ) : null}
      {startTwoFactor.data && !isEnabled ? (
        <TwoFactorEnrollment appID={appID} enrollment={startTwoFactor.data} />
      ) : null}
      <ErrorAlert error={status.error ?? startTwoFactor.error} />
    </Panel>
  );
}
