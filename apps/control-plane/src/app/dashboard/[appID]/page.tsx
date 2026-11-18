'use client';

import { useState } from 'react';

import { AppHeader } from '@/components/AppHeader';
import { AppKeys } from '@/components/AppKeys';
import { AppOverview } from '@/components/AppOverview';
import { AppSettingsForm } from '@/components/AppSettingsForm';
import { DangerZone } from '@/components/DangerZone';
import { DashboardShell } from '@/components/DashboardShell';
import { ErrorAlert } from '@/components/ErrorAlert';
import { FreezeNotice } from '@/components/FreezeNotice';
import { IncidentControls } from '@/components/IncidentControls';
import { PageStatus } from '@/components/PageStatus';
import { QuickStart } from '@/components/QuickStart';
import { Tabs, TabsList, TabsPanel, TabsTab } from '@/components/ui/tabs';
import { useSignInRedirect } from '@/components/useSignInRedirect';
import { useSearchParam } from '@/hooks/useSearchParam';
import { useApp, useGatewayURL } from '@/lib/queries';

import type { AppTab, AppTabOption } from '@/components/types';
import type { PageProps } from '@farm.js/core';

const TABS: AppTabOption[] = [
  { value: 'overview', label: 'Overview' },
  { value: 'keys', label: 'Keys' },
  { value: 'settings', label: 'Settings' },
  { value: 'integration', label: 'Integration' }
];

export default function AppPage({ params = {} }: PageProps) {
  const appID = String(params.appID ?? '');
  const app = useApp(appID);
  const gatewayURL = useGatewayURL();
  const tabParam = useSearchParam('tab');
  const linkedTab = TABS.find((option) => option.value === tabParam)?.value;
  const [chosenTab, setTab] = useState<AppTab | null>(null);
  const tab = chosenTab ?? linkedTab ?? 'overview';
  const signedOut = useSignInRedirect(app.error);

  if (signedOut) return <PageStatus isLoading>Taking you to sign in</PageStatus>;

  return (
    <DashboardShell activeAppID={appID}>
      {app.isPending ? <PageStatus isLoading>Loading app</PageStatus> : null}
      <ErrorAlert error={app.error} />
      {app.data ? (
        <main className="grid grid-cols-[minmax(0,1fr)] gap-6">
          <AppHeader app={app.data} />
          {app.data.isFrozen ? <FreezeNotice frozenAt={app.data.frozenAt ?? null} /> : null}
          <Tabs value={tab} onValueChange={(value) => setTab(value as AppTab)}>
            <TabsList className="w-full justify-start overflow-x-auto border-b" variant="underline">
              {TABS.map((option) => (
                <TabsTab
                  key={option.value}
                  className="grow px-1 text-sm sm:grow-0 sm:px-[calc(--spacing(2.5)-1px)]"
                  value={option.value}
                >
                  {option.label}
                </TabsTab>
              ))}
            </TabsList>
            <TabsPanel className="pt-4" value="overview">
              <AppOverview app={app.data} onOpenTab={setTab} />
            </TabsPanel>
            <TabsPanel className="pt-4" value="keys">
              <AppKeys app={app.data} />
            </TabsPanel>
            <TabsPanel className="grid gap-6 pt-4" value="settings">
              <IncidentControls app={app.data} />
              <AppSettingsForm app={app.data} />
              <DangerZone appID={appID} appName={app.data.name} />
            </TabsPanel>
            <TabsPanel className="pt-4" value="integration">
              {gatewayURL.data ? <QuickStart appID={appID} gatewayURL={gatewayURL.data} /> : null}
            </TabsPanel>
          </Tabs>
        </main>
      ) : null}
    </DashboardShell>
  );
}
