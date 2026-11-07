'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { useAppKeys, useUsage } from '@/lib/queries';

import { KeysList } from './KeysList';
import { KeysTable } from './KeysTable';
import { Panel } from './Panel';
import { QuietState } from './QuietState';

import type { AppProps } from './types';

export function AppKeys({ app }: AppProps) {
  const keys = useAppKeys(app.appID);
  const usage = useUsage(app.appID);
  return (
    <Panel
      title="User keys"
      description="Every key your users stored, through the widget or an import. Fiducy shows handles and counts, never the key."
    >
      {keys.isPending ? <Skeleton className="h-32 w-full" /> : null}
      {keys.isError ? (
        <QuietState title="Keys are not available" description={keys.error.message} />
      ) : null}
      {keys.data?.length === 0 ? (
        <QuietState
          title="No stored keys yet"
          description="Keys appear here when a user pastes one into the widget on an allowed origin."
        />
      ) : null}
      {keys.data?.length ? (
        <>
          <div className="md:hidden">
            <KeysList
              appID={app.appID}
              keys={keys.data}
              usage={usage.data}
              monthlyLimit={app.monthlyRequestLimitPerKey}
            />
          </div>
          <div className="hidden md:block">
            <KeysTable
              appID={app.appID}
              keys={keys.data}
              usage={usage.data}
              monthlyLimit={app.monthlyRequestLimitPerKey}
            />
          </div>
        </>
      ) : null}
    </Panel>
  );
}
