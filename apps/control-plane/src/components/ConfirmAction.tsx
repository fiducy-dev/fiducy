import { useState } from 'react';

import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { TWO_FACTOR_CODE_PATTERN } from '@/lib/constants';

import { ConfirmField } from './ConfirmField';

import type { ConfirmActionProps } from './types';

export function ConfirmAction({
  trigger,
  title,
  description,
  confirmLabel,
  confirmPhrase,
  requiresCode = false,
  onConfirm
}: ConfirmActionProps) {
  const [typed, setTyped] = useState('');
  const [code, setCode] = useState('');
  const isPhraseTyped = !confirmPhrase || typed === confirmPhrase;
  const isCodeTyped = !requiresCode || TWO_FACTOR_CODE_PATTERN.test(code);

  function reset() {
    setTyped('');
    setCode('');
  }

  return (
    <AlertDialog onOpenChange={reset}>
      <AlertDialogTrigger render={trigger} />
      <AlertDialogPopup bottomStickOnMobile={false}>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {confirmPhrase ? (
          <ConfirmField
            label={`Type ${confirmPhrase} to confirm`}
            value={typed}
            onChange={setTyped}
          />
        ) : null}
        {requiresCode ? (
          <ConfirmField isCode label="Authenticator code" value={code} onChange={setCode} />
        ) : null}
        <AlertDialogFooter>
          <AlertDialogClose render={<Button variant="ghost" />}>Cancel</AlertDialogClose>
          <AlertDialogClose
            render={<Button variant="destructive" disabled={!isPhraseTyped || !isCodeTyped} />}
            onClick={() => onConfirm(code)}
          >
            {confirmLabel}
          </AlertDialogClose>
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
  );
}
