import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

import { SpendLimitFields } from './SpendLimitFields';

import type { AppSettings } from '@/lib/types';
import type { AppSettingsFieldsProps } from './types';

const RECORD_STORAGE_OPTIONS = [
  { label: 'With Fiducy', value: 'fiducy' },
  { label: 'In your database', value: 'app' }
];

const KEY_IMPORT_OPTIONS = [
  { label: 'Off', value: 'off' },
  { label: 'On', value: 'on' }
];

function describeRecordStorage(recordStorage: AppSettings['recordStorage']): string {
  const value = recordStorage ?? 'fiducy';
  return RECORD_STORAGE_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export function AppSettingsFields({ defaults }: AppSettingsFieldsProps) {
  return (
    <>
      <Field>
        <FieldLabel>App name</FieldLabel>
        <Input name="name" required maxLength={80} defaultValue={defaults?.name} />
      </Field>
      <Field>
        <FieldLabel>Allowed origins</FieldLabel>
        <Textarea
          name="allowedOrigins"
          className="font-mono"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          defaultValue={defaults?.allowedOrigins.join('\n')}
        />
        <FieldDescription>One per line, like https://chat.example.com</FieldDescription>
      </Field>
      <Field>
        <FieldLabel>Monthly request limit per user key</FieldLabel>
        <Input
          name="monthlyRequestLimitPerKey"
          required
          type="number"
          inputMode="numeric"
          min={1}
          defaultValue={defaults?.monthlyRequestLimitPerKey ?? 10000}
        />
      </Field>
      <SpendLimitFields spendLimits={defaults ? (defaults.spendLimits ?? {}) : undefined} />
      <Field>
        <FieldLabel>Key import</FieldLabel>
        <Select
          name="allowKeyImport"
          items={KEY_IMPORT_OPTIONS}
          defaultValue={defaults?.allowKeyImport ? 'on' : 'off'}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectPopup>
            {KEY_IMPORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>
        <FieldDescription>
          Lets your server move existing keys in with fiducy.importKeys(). Turn off when done.
        </FieldDescription>
      </Field>
      {defaults ? (
        <Field>
          <FieldLabel>Where sealed keys live</FieldLabel>
          <Input readOnly value={describeRecordStorage(defaults.recordStorage)} />
          <FieldDescription>Fixed when the app is created.</FieldDescription>
        </Field>
      ) : (
        <Field>
          <FieldLabel>Where sealed keys live</FieldLabel>
          <Select name="recordStorage" items={RECORD_STORAGE_OPTIONS} defaultValue="fiducy">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectPopup>
              {RECORD_STORAGE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
          <FieldDescription>
            With Fiducy, you store a handle. In your database, you send the sealed record each call.
            Can't change later.
          </FieldDescription>
        </Field>
      )}
    </>
  );
}
