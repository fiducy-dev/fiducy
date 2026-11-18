import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { DEFAULT_SPEND_LIMITS } from '@/lib/constants';

import type { SpendLimitFieldsProps } from './types';

const SPEND_LIMIT_FIELDS = [
  { name: 'dailyDollarLimitPerKey', label: 'Daily spend per user key, USD', isDollars: true },
  { name: 'dailyDollarLimitPerApp', label: 'Daily spend for the app, USD', isDollars: true },
  { name: 'minuteDollarLimitPerApp', label: 'Spend per minute for the app, USD', isDollars: true },
  {
    name: 'concurrentRequestLimitPerKey',
    label: 'Requests at once per user key',
    isDollars: false
  },
  { name: 'maximumOutputTokens', label: 'Output tokens per request', isDollars: false }
] as const;

export function SpendLimitFields({ spendLimits }: SpendLimitFieldsProps) {
  const values = spendLimits ?? DEFAULT_SPEND_LIMITS;
  return (
    <fieldset className="grid gap-4 border-y py-4">
      <legend className="float-left mb-1 w-full font-medium text-base/4.5 text-foreground sm:text-sm/4">
        Spend limits
      </legend>
      <p className="-mt-2 text-muted-foreground text-xs">
        Checked before each call. Empty means no limit. With any limit set, only priced endpoints
        work.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {SPEND_LIMIT_FIELDS.map((field) => (
          <Field key={field.name}>
            <FieldLabel>{field.label}</FieldLabel>
            <Input
              name={field.name}
              type="number"
              inputMode={field.isDollars ? 'decimal' : 'numeric'}
              min={field.isDollars ? 0 : 1}
              step={field.isDollars ? 0.01 : 1}
              placeholder="No limit"
              defaultValue={values[field.name] ?? ''}
            />
          </Field>
        ))}
      </div>
    </fieldset>
  );
}
