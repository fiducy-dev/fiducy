import { QuietState } from './QuietState';
import { formatNumber, formatProvider } from './format';

import type { ProviderBreakdownProps } from './types';

export function ProviderBreakdown({ providers }: ProviderBreakdownProps) {
  const total = providers.reduce((sum, provider) => sum + provider.requestCount, 0);
  if (!total) {
    return <QuietState title="No provider traffic yet" description="Shows once calls come in." />;
  }
  return (
    <ul className="grid gap-3">
      {[...providers]
        .sort((first, second) => second.requestCount - first.requestCount)
        .map((provider) => (
          <li key={provider.provider} className="grid gap-1.5">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="text-foreground">{formatProvider(provider.provider)}</span>
              <span className="text-ink-quiet text-xs tabular-nums">
                {formatNumber(provider.requestCount)}
              </span>
            </div>
            <div className="h-1 bg-muted">
              <div
                className="h-full bg-foreground"
                style={{ width: `${(provider.requestCount / total) * 100}%` }}
              />
            </div>
          </li>
        ))}
    </ul>
  );
}
