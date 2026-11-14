'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTab } from '@/components/ui/tabs';
import { useUsageSeries } from '@/lib/queries';

import { Panel } from './Panel';
import { QuietState } from './QuietState';
import { UsageBars } from './UsageBars';
import { UsageTable } from './UsageTable';

import type { UsageDay } from '@/lib/types';
import type { AppReferenceProps, UsageBodyProps, UsageMetric, UsageMetricOption } from './types';

const METRIC_OPTIONS: UsageMetricOption[] = [
  { value: 'requestCount', label: 'Requests' },
  { value: 'inputTokens', label: 'Input' },
  { value: 'outputTokens', label: 'Output' }
];

function hasTraffic(days: UsageDay[]): boolean {
  return days.some((day) => day.requestCount > 0);
}

function UsageBody({ days, metric, isTable }: UsageBodyProps) {
  if (!hasTraffic(days)) {
    return (
      <QuietState
        title="No requests in the last 30 days"
        description="Gateway calls show here. Prompts are never stored."
      />
    );
  }
  return isTable ? <UsageTable days={days} /> : <UsageBars days={days} metric={metric} />;
}

export function UsageChart({ appID }: AppReferenceProps) {
  const series = useUsageSeries(appID);
  const [metric, setMetric] = useState<UsageMetric>('requestCount');
  const [isTable, setIsTable] = useState(false);
  const controls = (
    <div className="flex items-center gap-2">
      <Tabs value={metric} onValueChange={(value) => setMetric(value as UsageMetric)}>
        <TabsList aria-label="Metric">
          {METRIC_OPTIONS.map((option) => (
            <TabsTab key={option.value} size="sm" value={option.value}>
              {option.label}
            </TabsTab>
          ))}
        </TabsList>
      </Tabs>
      <Button size="xs" variant="ghost" onClick={() => setIsTable(!isTable)}>
        {isTable ? 'Chart' : 'Table'}
      </Button>
    </div>
  );
  return (
    <Panel collapsible title="Last 30 days" description="Daily, in UTC." action={controls}>
      {series.isPending ? <Skeleton className="h-56 w-full" /> : null}
      {series.isError ? (
        <QuietState title="Usage history is not available" description={series.error.message} />
      ) : null}
      {series.data ? <UsageBody days={series.data.days} metric={metric} isTable={isTable} /> : null}
    </Panel>
  );
}
