'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { readAppSettingsForm } from '@/lib/client';
import { useUpdateApp } from '@/lib/queries';

import { AppSettingsFields } from './AppSettingsFields';
import { ErrorAlert } from './ErrorAlert';
import { Panel } from './Panel';

import type { FormEvent } from 'react';
import type { AppProps } from './types';

export function AppSettingsForm({ app }: AppProps) {
  const updateApp = useUpdateApp(app.appID);

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateApp.mutate(readAppSettingsForm(event.currentTarget));
  }

  return (
    <Panel
      title="Settings"
      description="The gateway picks up changes at once, or within 30 seconds if it can't be reached."
    >
      <form className="grid max-w-xl gap-4" onSubmit={save}>
        <AppSettingsFields defaults={app} />
        <Button className="justify-self-start" loading={updateApp.isPending} type="submit">
          Save settings
        </Button>
        {updateApp.isSuccess ? (
          <Alert>
            <AlertDescription>Saved.</AlertDescription>
          </Alert>
        ) : null}
        <ErrorAlert error={updateApp.error} />
      </form>
    </Panel>
  );
}
