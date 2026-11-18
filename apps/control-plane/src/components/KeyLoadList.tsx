import { KeyLimitMeter } from './KeyLimitMeter';
import { QuietState } from './QuietState';
import { shortenIdentifier } from './format';

import type { KeyLoad, KeyLoadListProps } from './types';

const VISIBLE_KEY_COUNT = 5;

function rankKeys(requestsByKey: Record<string, number>): KeyLoad[] {
  return Object.entries(requestsByKey)
    .map(([keyID, requestCount]) => ({ keyID, requestCount }))
    .sort((first, second) => second.requestCount - first.requestCount)
    .slice(0, VISIBLE_KEY_COUNT);
}

export function KeyLoadList({ usage, monthlyLimit }: KeyLoadListProps) {
  const keys = rankKeys(usage.requestsByKey);
  if (!keys.length) {
    return (
      <QuietState
        title="No requests this month"
        description="Keys show here once users start chatting."
      />
    );
  }
  return (
    <ul className="grid">
      {keys.map((key) => (
        <li
          key={key.keyID}
          className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-dashed py-3 last:border-b-0"
        >
          <code className="truncate text-foreground text-xs">
            {shortenIdentifier(key.keyID, 14)}
          </code>
          <KeyLimitMeter requestCount={key.requestCount} monthlyLimit={monthlyLimit} />
        </li>
      ))}
    </ul>
  );
}
