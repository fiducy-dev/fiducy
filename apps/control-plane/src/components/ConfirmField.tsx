import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

import type { ConfirmFieldProps } from './types';

export function ConfirmField({ label, value, isCode = false, onChange }: ConfirmFieldProps) {
  return (
    <Field className="px-6 pb-4">
      <FieldLabel>{label}</FieldLabel>
      <Input
        autoComplete={isCode ? 'one-time-code' : 'off'}
        inputMode={isCode ? 'numeric' : undefined}
        maxLength={isCode ? 6 : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value.trim())}
      />
    </Field>
  );
}
