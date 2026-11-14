'use client';

import { PlusIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';

import { CreateAppForm } from './CreateAppForm';

import type { CreateAppDialogProps } from './types';

export function CreateAppDialog({ isOpen, onOpenChange, ...formProps }: CreateAppDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger render={<Button size="sm" />}>
        <PlusIcon />
        New app
      </DialogTrigger>
      <DialogPopup className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create an app</DialogTitle>
          <DialogDescription>One app per product. The secret is shown once.</DialogDescription>
        </DialogHeader>
        <DialogPanel>
          <CreateAppForm {...formProps} />
        </DialogPanel>
      </DialogPopup>
    </Dialog>
  );
}
