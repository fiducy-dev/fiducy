'use client';

import { useState } from 'react';
import { renderSVG } from 'uqr';

import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { isSignedOut, signInAgain } from '@/lib/client';
import { TWO_FACTOR_CODE_PATTERN } from '@/lib/constants';
import { useConfirmTwoFactor } from '@/lib/twoFactorQueries';

import { CopyValue } from './CopyValue';
import { ErrorAlert } from './ErrorAlert';

import type { FormEvent } from 'react';
import type { TwoFactorEnrollmentProps } from './types';

function toQRCodeSource(otpauthURL: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(renderSVG(otpauthURL, { border: 1 }))}`;
}

export function TwoFactorEnrollment({ appID, enrollment }: TwoFactorEnrollmentProps) {
  const [code, setCode] = useState('');
  const confirmTwoFactor = useConfirmTwoFactor();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    confirmTwoFactor.mutate(code, {
      onError: (error) => {
        if (isSignedOut(error)) signInAgain(appID);
      }
    });
  }

  return (
    <form className="grid gap-4" onSubmit={submit}>
      <div className="grid justify-items-start gap-2">
        <img
          alt="Two-factor setup code"
          className="size-40 border"
          src={toQRCodeSource(enrollment.otpauthURL)}
        />
        <a
          className="text-foreground text-xs underline underline-offset-4"
          href={enrollment.otpauthURL}
        >
          Open in your authenticator app
        </a>
        <CopyValue label="setup key" value={enrollment.secret} />
      </div>
      <Field>
        <FieldLabel>6-digit code</FieldLabel>
        <Input
          autoComplete="one-time-code"
          inputMode="numeric"
          maxLength={6}
          value={code}
          onChange={(event) => setCode(event.target.value.trim())}
        />
      </Field>
      <Button
        className="justify-self-start"
        size="sm"
        type="submit"
        disabled={!TWO_FACTOR_CODE_PATTERN.test(code)}
        loading={confirmTwoFactor.isPending}
      >
        Turn on two-factor
      </Button>
      <ErrorAlert error={confirmTwoFactor.error} />
    </form>
  );
}
