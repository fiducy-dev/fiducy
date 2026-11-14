import { base32 } from '@better-auth/utils/base32';
import { createOTP } from '@better-auth/utils/otp';

import { TWO_FACTOR_ISSUER, TWO_FACTOR_LOCK_MILLISECONDS } from './constants';
import { TWO_FACTOR_MAXIMUM_ATTEMPTS, TWO_FACTOR_PERIOD_SECONDS } from './constants';
import { TWO_FACTOR_SECRET_BYTES, TWO_FACTOR_STEP_WINDOW } from './constants';
import { TWO_FACTOR_ALREADY_ON, TWO_FACTOR_CODE_NOT_VALID } from './failures';
import { TWO_FACTOR_LOCKED, TWO_FACTOR_NOT_SET_UP } from './failures';
import { fail, succeed } from './result';
import { matchesToken } from './secrets';

import type { ControlResult, ControlStore, StoredTwoFactor } from './types';
import type { TwoFactorEnrollment, TwoFactorStatus } from './types';

function createAuthenticator(secret: Uint8Array) {
  return createOTP(secret, { period: TWO_FACTOR_PERIOD_SECONDS });
}

export function readCurrentStep(now: number): number {
  return Math.floor(now / (TWO_FACTOR_PERIOD_SECONDS * 1000));
}

async function findMatchingStep(secret: string, code: string, now: number) {
  const authenticator = createAuthenticator(base32.decode(secret));
  const currentStep = readCurrentStep(now);
  for (let offset = -TWO_FACTOR_STEP_WINDOW; offset <= TWO_FACTOR_STEP_WINDOW; offset += 1) {
    const step = currentStep + offset;
    if (matchesToken(code, await authenticator.hotp(step))) return step;
  }
  return null;
}

function countFailure(record: StoredTwoFactor, now: number): StoredTwoFactor {
  const failedAttempts = record.failedAttempts + 1;
  if (failedAttempts < TWO_FACTOR_MAXIMUM_ATTEMPTS) return { ...record, failedAttempts };
  const lockedUntil = new Date(now + TWO_FACTOR_LOCK_MILLISECONDS).toISOString();
  return { ...record, failedAttempts: 0, lockedUntil };
}

function isLocked(record: StoredTwoFactor, now: number): boolean {
  return record.lockedUntil !== null && new Date(record.lockedUntil).getTime() > now;
}

async function spendCode(
  store: ControlStore,
  record: StoredTwoFactor,
  code: string,
  now: number
): Promise<ControlResult<StoredTwoFactor>> {
  if (isLocked(record, now)) return fail(TWO_FACTOR_LOCKED);
  const step = await findMatchingStep(record.secret, code, now);
  if (step === null || step <= (record.lastUsedStep ?? Number.NEGATIVE_INFINITY)) {
    await store.saveTwoFactor(countFailure(record, now));
    return fail(TWO_FACTOR_CODE_NOT_VALID);
  }
  const confirmedAt = record.confirmedAt ?? new Date(now).toISOString();
  const spent = {
    ...record,
    confirmedAt,
    lastUsedStep: step,
    failedAttempts: 0,
    lockedUntil: null
  };
  await store.saveTwoFactor(spent);
  return succeed(spent);
}

export async function readTwoFactorStatus(
  store: ControlStore,
  ownerID: string
): Promise<TwoFactorStatus> {
  const record = await store.findTwoFactor(ownerID);
  return { isEnabled: Boolean(record?.confirmedAt) };
}

export async function startTwoFactor(
  store: ControlStore,
  ownerID: string,
  account: string
): Promise<ControlResult<TwoFactorEnrollment>> {
  const existing = await store.findTwoFactor(ownerID);
  if (existing?.confirmedAt) return fail(TWO_FACTOR_ALREADY_ON);
  const secretBytes = crypto.getRandomValues(new Uint8Array(TWO_FACTOR_SECRET_BYTES));
  const secret = base32.encode(secretBytes, { padding: false });
  const pending = { ownerID, secret, confirmedAt: null, lastUsedStep: null };
  await store.saveTwoFactor({ ...pending, failedAttempts: 0, lockedUntil: null });
  const otpauthURL = createAuthenticator(secretBytes).url(TWO_FACTOR_ISSUER, account);
  return succeed({ secret, otpauthURL });
}

export async function confirmTwoFactor(
  store: ControlStore,
  ownerID: string,
  code: string,
  now = Date.now()
): Promise<ControlResult<TwoFactorStatus>> {
  const record = await store.findTwoFactor(ownerID);
  if (!record) return fail(TWO_FACTOR_NOT_SET_UP);
  if (record.confirmedAt) return fail(TWO_FACTOR_ALREADY_ON);
  const spent = await spendCode(store, record, code, now);
  return spent.ok ? succeed({ isEnabled: true }) : spent;
}

export async function checkSecondFactor(
  store: ControlStore,
  ownerID: string,
  code: string,
  now = Date.now()
): Promise<ControlResult<null>> {
  const record = await store.findTwoFactor(ownerID);
  if (!record?.confirmedAt) return fail(TWO_FACTOR_NOT_SET_UP);
  const spent = await spendCode(store, record, code, now);
  return spent.ok ? succeed(null) : spent;
}
