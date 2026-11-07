import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDownIcon } from 'lucide-react';

import { KeyLimitMeter } from './KeyLimitMeter';
import { RevokeKey } from './RevokeKey';
import { formatDay, formatProvider, formatRelativeTime, shortenIdentifier } from './format';

import type { KeysTableProps } from './types';

export function KeysList({ appID, keys, usage, monthlyLimit }: KeysTableProps) {
  return (
    <ul className="grid">
      {keys.map((key) => {
        const revoked = key.status === 'revoked';
        return (
          <li
            key={key.keyID}
            className={`border-b border-dashed last:border-b-0 ${revoked ? 'opacity-60' : ''}`}
          >
            <Collapsible>
              <CollapsibleTrigger className="group flex w-full items-center justify-between gap-3 py-3 text-left">
                <div className="grid min-w-0 gap-0.5">
                  <span className="font-medium text-sm">{formatProvider(key.provider)}</span>
                  <code className="truncate text-ink-quiet text-xs">
                    {shortenIdentifier(key.keyID, 10)}
                  </code>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {key.source === 'import' ? <Badge variant="secondary">Imported</Badge> : null}
                  <Badge variant={revoked ? 'secondary' : 'outline'}>
                    {revoked ? 'Revoked' : 'Active'}
                  </Badge>
                  <ChevronDownIcon className="size-4 text-ink-quiet transition-transform group-data-panel-open:rotate-180" />
                </div>
              </CollapsibleTrigger>
              <CollapsiblePanel className="grid gap-3 pb-4 data-closed:hidden">
                <KeyLimitMeter
                  requestCount={usage?.requestsByKey[key.keyID] ?? 0}
                  monthlyLimit={monthlyLimit}
                />
                <div className="flex items-center justify-between gap-3 text-ink-quiet text-xs">
                  <span>
                    Last used {key.lastUsedAt ? formatRelativeTime(key.lastUsedAt) : 'never'}, added{' '}
                    {formatDay(key.createdAt)}
                  </span>
                  {revoked ? null : <RevokeKey appID={appID} keyID={key.keyID} />}
                </div>
              </CollapsiblePanel>
            </Collapsible>
          </li>
        );
      })}
    </ul>
  );
}
