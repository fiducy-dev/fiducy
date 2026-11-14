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
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

import type { ConfirmActionProps } from './types';

export function ConfirmAction({
  trigger,
  title,
  description,
  confirmLabel,
  confirmPhrase,
  onConfirm
}: ConfirmActionProps) {
  const [typed, setTyped] = useState('');
  const isConfirmed = !confirmPhrase || typed === confirmPhrase;
  return (
    <AlertDialog onOpenChange={() => setTyped('')}>
      <AlertDialogTrigger render={trigger} />
      <AlertDialogPopup bottomStickOnMobile={false}>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {confirmPhrase ? (
          <Field className="px-6 pb-4">
            <FieldLabel>Type {confirmPhrase} to confirm</FieldLabel>
            <Input
              autoComplete="off"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
            />
          </Field>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogClose render={<Button variant="ghost" />}>Cancel</AlertDialogClose>
          <AlertDialogClose
            render={<Button variant="destructive" disabled={!isConfirmed} />}
            onClick={onConfirm}
          >
            {confirmLabel}
          </AlertDialogClose>
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
  );
}
