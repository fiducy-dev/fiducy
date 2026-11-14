'use client';

import { useMutation } from '@tanstack/react-query';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface SecretRevealProps {
  appSecret: string;
}

export function SecretReveal({ appSecret }: SecretRevealProps) {
  const copySecret = useMutation({ mutationFn: () => navigator.clipboard.writeText(appSecret) });
  return (
    <Alert>
      <AlertTitle>Copy your secret now. It won't be shown again.</AlertTitle>
      <AlertDescription className="grid gap-3">
        <code
          className="block select-all break-all border border-foreground border-dashed p-2.5 text-foreground"
          data-testid="app-secret"
        >
          {appSecret}
        </code>
        <Button
          className="justify-self-start max-sm:justify-self-stretch"
          variant="outline"
          size="sm"
          onClick={() => copySecret.mutate()}
        >
          {copySecret.isSuccess ? 'Copied' : 'Copy secret'}
        </Button>
      </AlertDescription>
    </Alert>
  );
}
