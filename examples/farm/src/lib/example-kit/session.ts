import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from './constants.ts';
import { readExampleSetting } from './environment.ts';

function readSessionSecret(): string {
  const secret = readExampleSetting('EXAMPLE_SESSION_SECRET');
  if (!secret || secret.length < 32) {
    throw new Error('Set EXAMPLE_SESSION_SECRET to 32 or more random characters');
  }
  return secret;
}

function sign(userID: string): string {
  return createHmac('sha256', readSessionSecret()).update(userID).digest('base64url');
}

function readCookie(headers: Headers, name: string): string | null {
  const cookies = headers.get('cookie') ?? '';
  const match = cookies.split(/;\s*/).find((cookie) => cookie.startsWith(`${name}=`));
  return match ? match.slice(name.length + 1) : null;
}

function isValidSignature(userID: string, signature: string): boolean {
  const expected = Buffer.from(sign(userID));
  const received = Buffer.from(signature);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export function readSessionUser(request: Request | { headers: Headers }): string | null {
  const value = readCookie(request.headers, SESSION_COOKIE);
  const [userID, signature] = value?.split('.') ?? [];
  if (!userID || !signature) return null;
  return isValidSignature(userID, signature) ? userID : null;
}

export function signInTestUser(): Response {
  const userID = `user_${randomBytes(9).toString('base64url').replace(/[-_]/g, '0')}`;
  const cookie = [
    `${SESSION_COOKIE}=${userID}.${sign(userID)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${SESSION_MAX_AGE_SECONDS}`
  ].join('; ');
  return new Response(null, { status: 303, headers: { location: '/', 'set-cookie': cookie } });
}
