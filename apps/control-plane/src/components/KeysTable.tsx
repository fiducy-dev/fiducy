import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';

import { KeyLimitMeter } from './KeyLimitMeter';
import { RevokeKey } from './RevokeKey';
import { formatDay, formatProvider, formatRelativeTime, shortenIdentifier } from './format';

import type { KeysTableProps } from './types';

export function KeysTable({ appID, keys, usage, monthlyLimit }: KeysTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Key</TableHead>
          <TableHead>Provider</TableHead>
          <TableHead>This month</TableHead>
          <TableHead>Last used</TableHead>
          <TableHead>Added</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="sr-only">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {keys.map((key) => (
          <TableRow
            key={key.keyID}
            className={key.status === 'revoked' ? 'text-ink-quiet' : undefined}
          >
            <TableCell className="font-mono text-xs">{shortenIdentifier(key.keyID, 14)}</TableCell>
            <TableCell>
              <span className="flex items-center gap-2">
                {formatProvider(key.provider)}
                {key.source === 'import' ? <Badge variant="secondary">Imported</Badge> : null}
              </span>
            </TableCell>
            <TableCell>
              <KeyLimitMeter
                requestCount={usage?.requestsByKey[key.keyID] ?? 0}
                monthlyLimit={monthlyLimit}
              />
            </TableCell>
            <TableCell>{key.lastUsedAt ? formatRelativeTime(key.lastUsedAt) : 'Never'}</TableCell>
            <TableCell>{formatDay(key.createdAt)}</TableCell>
            <TableCell>
              <Badge variant={key.status === 'active' ? 'outline' : 'secondary'}>
                {key.status === 'active' ? 'Active' : 'Revoked'}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              {key.status === 'active' ? <RevokeKey appID={appID} keyID={key.keyID} /> : null}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
