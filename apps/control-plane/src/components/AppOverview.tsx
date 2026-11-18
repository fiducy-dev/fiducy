'use client';

import { useAppKeys, useUsage, useUsageSeries } from '@/lib/queries';

import { KeyLoadList } from './KeyLoadList';
import { Panel } from './Panel';
import { ProviderBreakdown } from './ProviderBreakdown';
import { QuietState } from './QuietState';
import { SecurityPanel } from './SecurityPanel';
import { SetupChecklist } from './SetupChecklist';
import { StatRow } from './StatRow';
import { UsageChart } from './UsageChart';
import { formatCompact, formatMonth, formatNumber } from './format';

import type { AppKeyView, AppView, UsageSummary } from '@/lib/types';
import type { OverviewProps, SetupStep, StatTile } from './types';

function buildStats(usage: UsageSummary | undefined, keys: AppKeyView[] | undefined): StatTile[] {
  const month = usage ? formatMonth(usage.month) : 'This month';
  const activeKeys = keys?.filter((key) => key.status === 'active').length;
  return [
    {
      label: 'Requests',
      value: usage ? formatNumber(usage.requestCount) : '-',
      detail: month,
      testID: 'request-count'
    },
    { label: 'Input tokens', value: usage ? formatCompact(usage.inputTokens) : '-', detail: month },
    {
      label: 'Output tokens',
      value: usage ? formatCompact(usage.outputTokens) : '-',
      detail: month
    },
    {
      label: 'Stored keys',
      value: activeKeys === undefined ? '-' : formatNumber(activeKeys),
      detail: 'Active, not revoked'
    }
  ];
}

function buildSteps(
  app: AppView,
  usage: UsageSummary | undefined,
  keys: AppKeyView[] | undefined
): SetupStep[] {
  const hasKeyActivity = Object.keys(usage?.requestsByKey ?? {}).length > 0;
  return [
    { label: 'Create the app', detail: '', isDone: true },
    {
      label: 'Allow your site',
      detail: 'Add the site that embeds the widget.',
      isDone: app.allowedOrigins.length > 0,
      target: 'settings'
    },
    {
      label: 'A user stores a key',
      detail: 'Mount the widget.',
      isDone: Boolean(keys?.length) || hasKeyActivity,
      target: 'integration'
    },
    {
      label: 'First call through the gateway',
      detail: 'Point your AI SDK at the gateway.',
      isDone: (usage?.requestCount ?? 0) > 0,
      target: 'integration'
    }
  ];
}

export function AppOverview({ app, onOpenTab }: OverviewProps) {
  const usage = useUsage(app.appID);
  const keys = useAppKeys(app.appID);
  const series = useUsageSeries(app.appID);
  const steps = buildSteps(app, usage.data, keys.data);
  const doneCount = steps.filter((step) => step.isDone).length;
  return (
    <div className="grid gap-6">
      <StatRow stats={buildStats(usage.data, keys.data)} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid content-start gap-6">
          <UsageChart appID={app.appID} />
          <div className="grid gap-6 md:grid-cols-2">
            <Panel
              collapsible
              defaultOpen={false}
              title="Busiest keys"
              description="This month vs. the per-key limit."
            >
              {usage.data ? (
                <KeyLoadList usage={usage.data} monthlyLimit={app.monthlyRequestLimitPerKey} />
              ) : (
                <QuietState
                  title="Usage is loading"
                  description={usage.error?.message ?? 'One moment.'}
                />
              )}
            </Panel>
            <Panel
              collapsible
              defaultOpen={false}
              title="By provider"
              description="Requests in the last 30 days."
            >
              <ProviderBreakdown providers={series.data?.byProvider ?? []} />
            </Panel>
          </div>
        </div>
        <div className="grid content-start gap-6">
          {doneCount < steps.length ? (
            <Panel
              collapsible
              title="Get to first request"
              description={`${doneCount} of ${steps.length} done`}
            >
              <SetupChecklist steps={steps} onOpenTab={onOpenTab} />
            </Panel>
          ) : null}
          <Panel
            collapsible
            defaultOpen={false}
            title="Security"
            description="How this app handles keys."
          >
            <SecurityPanel app={app} />
          </Panel>
        </div>
      </div>
    </div>
  );
}
