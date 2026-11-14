import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

import { formatRelativeTime } from './format';

import type { FreezeNoticeProps } from './types';

export function FreezeNotice({ frozenAt }: FreezeNoticeProps) {
  return (
    <Alert variant="error">
      <AlertTitle>This app is frozen</AlertTitle>
      <AlertDescription>
        The gateway refuses every call for it
        {frozenAt ? `, since ${formatRelativeTime(frozenAt)}` : ''}. Rotate the app secret and
        deploy it before you unfreeze.
      </AlertDescription>
    </Alert>
  );
}
