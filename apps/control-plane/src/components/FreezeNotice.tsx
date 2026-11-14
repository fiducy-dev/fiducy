import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

import { formatRelativeTime } from './format';

import type { FreezeNoticeProps } from './types';

export function FreezeNotice({ frozenAt }: FreezeNoticeProps) {
  return (
    <Alert variant="error">
      <AlertTitle>App frozen</AlertTitle>
      <AlertDescription>
        All calls are refused{frozenAt ? ` since ${formatRelativeTime(frozenAt)}` : ''}. Rotate the
        secret before you unfreeze.
      </AlertDescription>
    </Alert>
  );
}
