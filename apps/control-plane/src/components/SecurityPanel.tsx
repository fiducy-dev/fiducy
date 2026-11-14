'use client';

import { useGatewayStatus } from '@/lib/queries';

import { formatRelativeTime, shortenIdentifier } from './format';

import type { AppView, GatewayStatus } from '@/lib/types';
import type { AppProps, SecurityRow } from './types';

const KEY_ACCESS_ROW: SecurityRow = {
  label: 'Key access',
  value: 'Gateway only',
  detail: 'Plain keys never leave the enclave.'
};

function describeStorage(app: AppView): SecurityRow {
  const isAppStorage = app.recordStorage === 'app';
  return {
    label: 'Sealed keys live',
    value: isAppStorage ? 'In your database' : 'With Fiducy',
    detail: isAppStorage
      ? 'You send the sealed record with each call.'
      : 'Your app stores a handle.'
  };
}

function describeKeyImport(app: AppView): SecurityRow {
  return {
    label: 'Key import',
    value: app.allowKeyImport ? 'On' : 'Off',
    detail: app.allowKeyImport
      ? 'Your server can send plain keys in. Turn it off once existing keys are moved.'
      : 'Keys only come in through the widget.'
  };
}

function formatDollars(amount: number): string {
  return `$${amount.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}

function listDollarLimits(app: AppView): string[] {
  const limits = app.spendLimits ?? {};
  const parts = [
    [limits.dailyDollarLimitPerKey, 'per key a day'],
    [limits.dailyDollarLimitPerApp, 'for the app a day'],
    [limits.minuteDollarLimitPerApp, 'a minute']
  ] as const;
  return parts
    .filter(([amount]) => typeof amount === 'number')
    .map(([amount, period]) => `${formatDollars(Number(amount))} ${period}`);
}

function describeSpendLimits(app: AppView): SecurityRow {
  const dollarLimits = listDollarLimits(app);
  const isOn = Object.values(app.spendLimits ?? {}).some((limit) => typeof limit === 'number');
  return {
    label: 'Spend limits',
    value: isOn ? 'On' : 'Off',
    detail: isOn
      ? `${dollarLimits.join(', ') || 'Output and concurrency caps only'}.`
      : 'Set them in Settings to cap what a leaked app secret can spend.'
  };
}

function describeAttestation(status: GatewayStatus | undefined): SecurityRow {
  if (!status?.pcr0) {
    return {
      label: 'Enclave',
      value: 'Not attested yet',
      detail: 'Shows the PCR0 hash once the gateway runs in a Nitro enclave.'
    };
  }
  return {
    label: 'Enclave',
    value: shortenIdentifier(status.pcr0, 16),
    detail: status.attestedAt ? `PCR0, attested ${formatRelativeTime(status.attestedAt)}` : 'PCR0',
    isMono: true
  };
}

function describeReachability(status: GatewayStatus | undefined): string {
  if (!status) return 'Unknown';
  return status.reachable ? 'Online' : 'Unreachable';
}

function describeGateway(status: GatewayStatus | undefined): SecurityRow {
  const lastSeen = status?.lastSeenAt
    ? `Last seen ${formatRelativeTime(status.lastSeenAt)}`
    : 'Never seen';
  const region = status?.region ? `, ${status.region}` : '';
  return {
    label: 'Gateway',
    value: describeReachability(status),
    detail: status ? `${lastSeen}${region}` : 'Status unavailable.'
  };
}

export function SecurityPanel({ app }: AppProps) {
  const gatewayStatus = useGatewayStatus();
  const rows = [
    KEY_ACCESS_ROW,
    describeStorage(app),
    describeKeyImport(app),
    describeSpendLimits(app),
    describeAttestation(gatewayStatus.data),
    describeGateway(gatewayStatus.data)
  ];
  return (
    <dl className="grid">
      {rows.map((row) => (
        <div key={row.label} className="grid gap-0.5 border-b border-dashed py-3 last:border-b-0">
          <dt className="text-ink-quiet text-xs">{row.label}</dt>
          <dd
            className={row.isMono ? 'font-mono text-foreground text-sm' : 'text-foreground text-sm'}
          >
            {row.value}
          </dd>
          <dd className="text-ink-quiet text-xs">{row.detail}</dd>
        </div>
      ))}
    </dl>
  );
}
