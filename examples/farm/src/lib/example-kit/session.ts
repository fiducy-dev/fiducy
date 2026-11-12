import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { DEFAULT_DATA_DIRECTORY, LOCAL_SECRET_FILE, MINIMUM_SECRET_LENGTH } from './constants.ts';
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from './constants.ts';
import { readExampleSetting } from './environment.ts';

function readLocalSecret(): string {
  const directory = resolve(readExampleSetting('EXAMPLE_DATA_DIR') ?? DEFAULT_DATA_DIRECTORY);
  const path = join(directory, LOCAL_SECRET_FILE);
  if (existsSync(path)) return readFileSync(path, 'utf8').trim();
  const secret = randomBytes(32).toString('hex');
  mkdirSync(directory, { recursive: true });
  writeFileSync(path, secret, { mode: 0o600 });
  return secret;
}

function readSessionSecret(): string {
  const secret = readExampleSetting('EXAMPLE_SESSION_SECRET');
  if (secret === undefined || secret === '') return readLocalSecret();
  if (secret.length < MINIMUM_SECRET_LENGTH) {
    throw new Error(`EXAMPLE_SESSION_SECRET must be ${MINIMUM_SECRET_LENGTH} or more characters`);
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
