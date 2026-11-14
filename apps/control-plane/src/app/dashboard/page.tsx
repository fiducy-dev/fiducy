'use client';

import { useState } from 'react';

import { AppCard } from '@/components/AppCard';
import { CreateAppDialog } from '@/components/CreateAppDialog';
import { CreateAppForm } from '@/components/CreateAppForm';
import { CreatedAppNotice } from '@/components/CreatedAppNotice';
import { DashboardShell } from '@/components/DashboardShell';
import { ErrorAlert } from '@/components/ErrorAlert';
import { PageStatus } from '@/components/PageStatus';
import { Panel } from '@/components/Panel';
import { useSignInRedirect } from '@/components/useSignInRedirect';
import { useApps, useCreateApp } from '@/lib/queries';

import type { AppSettings } from '@/lib/types';

export default function DashboardPage() {
  const apps = useApps();
  const createApp = useCreateApp();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const signedOut = useSignInRedirect(apps.error);

  function create(settings: AppSettings) {
    createApp.mutate(settings, { onSuccess: () => setIsDialogOpen(false) });
  }

  if (signedOut) return <PageStatus isLoading>Taking you to sign in</PageStatus>;
  const hasApps = Boolean(apps.data?.length);
  const formProps = { isPending: createApp.isPending, error: createApp.error, onCreate: create };

  return (
    <DashboardShell>
      <main className="grid gap-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="grid gap-1.5">
            <h1 className="font-semibold text-2xl text-foreground tracking-tight">Your apps</h1>
            <p className="text-ink-quiet text-sm">Each app has its own secret and limits.</p>
          </div>
          {hasApps ? (
            <CreateAppDialog isOpen={isDialogOpen} onOpenChange={setIsDialogOpen} {...formProps} />
          ) : null}
        </header>
        <ErrorAlert error={apps.error} />
        {createApp.data ? <CreatedAppNotice created={createApp.data} /> : null}
        {apps.isPending ? <PageStatus isLoading>Loading your apps</PageStatus> : null}
        {hasApps ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {apps.data?.map((app) => (
              <AppCard key={app.appID} app={app} />
            ))}
          </div>
        ) : null}
        {apps.data?.length === 0 ? (
          <Panel
            className="max-w-xl"
            title="No apps yet"
            description="Create one to get an app ID and secret."
          >
            <CreateAppForm {...formProps} />
          </Panel>
        ) : null}
      </main>
    </DashboardShell>
  );
}
