'use client';

import { signIn, signUp } from '@farm.js/auth/client';
import { useMutation } from '@tanstack/react-query';

import { ErrorAlert } from '@/components/ErrorAlert';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useSearchParam } from '@/hooks/useSearchParam';
import { readReturnPath } from '@/lib/client';

import type { FormEvent } from 'react';
import type { AuthFormProps, Credentials } from './types';

export function AuthForm({ mode }: AuthFormProps) {
  const isSignUp = mode === 'sign-up';
  const returnAppID = useSearchParam('app');
  const isConfirming = !isSignUp && returnAppID !== null;
  const authenticate = useMutation({
    mutationFn: async ({ email, password, name }: Credentials) => {
      const response = isSignUp
        ? await signUp({ email, password, name })
        : await signIn({ email, password });
      if (response.error) throw new Error(response.error.message ?? 'That did not work. Try again');
    },
    onSuccess: () => {
      window.location.href = readReturnPath(window.location.search);
    }
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    authenticate.mutate({
      email: String(formData.get('email') ?? ''),
      password: String(formData.get('password') ?? ''),
      name: String(formData.get('name') ?? '')
    });
  }

  return (
    <form className="grid gap-8" onSubmit={submit}>
      <div className="grid gap-2">
        <p className="font-mono text-[0.6875rem] text-muted-foreground uppercase tracking-[0.06em]">
          {isSignUp ? 'New account' : 'Welcome back'}
        </p>
        <h1 className="font-semibold text-3xl text-foreground tracking-tight">
          {isSignUp ? 'Create your developer account' : 'Sign in'}
        </h1>
        <p className="text-muted-foreground text-sm">
          {isSignUp
            ? 'One account for all your apps. Free to self-host.'
            : isConfirming
              ? 'Sign in again to confirm.'
              : 'Pick up where you left off.'}
        </p>
      </div>
      <div className="grid gap-5">
        {isSignUp ? (
          <Field>
            <FieldLabel>Name</FieldLabel>
            <Input name="name" required type="text" autoComplete="name" size="lg" />
          </Field>
        ) : null}
        <Field>
          <FieldLabel>Email</FieldLabel>
          <Input name="email" required type="email" autoComplete="email" size="lg" />
        </Field>
        <Field>
          <FieldLabel>Password</FieldLabel>
          <Input
            name="password"
            required
            minLength={8}
            type="password"
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            size="lg"
          />
        </Field>
        <Button
          className="w-full"
          size="lg"
          loading={authenticate.isPending || authenticate.isSuccess}
          type="submit"
        >
          {isSignUp ? 'Create account' : 'Sign in'}
        </Button>
        <ErrorAlert error={authenticate.error} />
      </div>
      <p className="border-t pt-5 text-muted-foreground text-sm">
        {isSignUp ? 'Already have an account?' : 'New here?'}
        <a
          className="ml-1 text-foreground underline underline-offset-4"
          href={isSignUp ? '/sign-in' : '/sign-up'}
        >
          {isSignUp ? 'Sign in' : 'Create one'}
        </a>
      </p>
    </form>
  );
}
