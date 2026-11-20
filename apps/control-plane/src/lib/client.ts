import { APP_ID_PATTERN, SPEND_LIMIT_NAMES, TWO_FACTOR_HEADER } from './constants';

import type { AppSettings, SpendLimits } from './types';

export class ControlPlaneError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
  }
}

function readErrorMessage(body: Record<string, unknown>): string {
  if (typeof body.message === 'string') return body.message;
  const details = body.details as Array<{ message?: string }> | undefined;
  return details?.[0]?.message ?? 'Something went wrong';
}

export async function requestControlPlane<Data>(
  path: string,
  init: RequestInit = {}
): Promise<Data> {
  const response = await fetch(path, {
    ...init,
    credentials: 'same-origin',
    headers: init.body ? { 'content-type': 'application/json', ...init.headers } : init.headers
  });
  const body = (await response.json()) as Record<string, unknown>;
  if (!response.ok) throw new ControlPlaneError(response.status, readErrorMessage(body));
  return body.data as Data;
}

export function isSignedOut(error: unknown): boolean {
  return error instanceof ControlPlaneError && error.status === 401;
}

export function parseOriginList(text: string): string[] {
  return text
    .split(/[\s,]+/)
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function readSpendLimits(formData: FormData): SpendLimits {
  const entries = SPEND_LIMIT_NAMES.map((name) => [name, String(formData.get(name) ?? '').trim()]);
  const filledEntries = entries.filter(([, value]) => value !== '');
  return Object.fromEntries(filledEntries.map(([name, value]) => [name, Number(value)]));
}

export function readAppSettingsForm(form: HTMLFormElement): AppSettings {
  const formData = new FormData(form);
  return {
    name: String(formData.get('name') ?? ''),
    allowedOrigins: parseOriginList(String(formData.get('allowedOrigins') ?? '')),
    monthlyRequestLimitPerKey: Number(formData.get('monthlyRequestLimitPerKey')),
    ...(formData.has('allowKeyImport') && {
      allowKeyImport: formData.get('allowKeyImport') === 'on'
    }),
    ...(formData.has(SPEND_LIMIT_NAMES[0]) && { spendLimits: readSpendLimits(formData) }),
    ...(formData.has('recordStorage') && {
      recordStorage: formData.get('recordStorage') === 'app' ? 'app' : 'fiducy'
    })
  };
}

export function readReturnPath(search: string): string {
  const appID = new URLSearchParams(search).get('app') ?? '';
  if (!APP_ID_PATTERN.test(appID)) return '/dashboard';
  return `/dashboard/${appID}?tab=settings`;
}

export function signInAgain(appID: string) {
  window.location.assign(`/sign-in?app=${encodeURIComponent(appID)}`);
}

export function withSecondFactor(method: string, code: string): RequestInit {
  return { method, headers: { [TWO_FACTOR_HEADER]: code } };
}
