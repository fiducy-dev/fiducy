import { describe, expect, it } from 'bun:test';
import { base32 } from '@better-auth/utils/base32';
import { createOTP } from '@better-auth/utils/otp';

import { checkSecondFactor, confirmTwoFactor } from '../src/lib/twoFactorService';
import { readCurrentStep, readTwoFactorStatus, startTwoFactor } from '../src/lib/twoFactorService';
import { OWNER_ID, createTestStore } from './fixtures';

const NOW = Date.UTC(2026, 10, 14, 10, 0, 0);
const STEP_MILLISECONDS = 30000;

async function codeFor(secret: string, now: number) {
  return createOTP(base32.decode(secret), { period: 30 }).hotp(readCurrentStep(now));
}

async function enroll() {
  const store = createTestStore();
  const started = await startTwoFactor(store, OWNER_ID, 'ben@chatforge.example');
  if (!started.ok) throw new Error(started.error.message);
  const confirmed = await confirmTwoFactor(
    store,
    OWNER_ID,
    await codeFor(started.value.secret, NOW),
    NOW
  );
  expect(confirmed.ok).toBe(true);
  return { store, secret: started.value.secret };
}

describe('setting up two-factor', () => {
  it('returns an authenticator link and stays off until a code is confirmed', async () => {
    const store = createTestStore();
    const started = await startTwoFactor(store, OWNER_ID, 'ben@chatforge.example');
    if (!started.ok) throw new Error(started.error.message);
    expect(started.value.otpauthURL).toStartWith('otpauth://totp/Fiducy:');
    expect(started.value.otpauthURL).toContain(`secret=${started.value.secret}`);
    expect(await readTwoFactorStatus(store, OWNER_ID)).toEqual({ isEnabled: false });
  });

  it('turns on with a valid code and refuses to replace a confirmed secret', async () => {
    const { store } = await enroll();
    expect(await readTwoFactorStatus(store, OWNER_ID)).toEqual({ isEnabled: true });
    const restarted = await startTwoFactor(store, OWNER_ID, 'ben@chatforge.example');
    expect(restarted.ok ? 200 : restarted.error.status).toBe(409);
  });
});

describe('checking the second factor', () => {
  it('refuses owners who have not set it up', async () => {
    const checked = await checkSecondFactor(createTestStore(), OWNER_ID, '123456', NOW);
    expect(checked.ok ? 200 : checked.error.status).toBe(403);
  });

  it('accepts the next code once and refuses it a second time', async () => {
    const { store, secret } = await enroll();
    const later = NOW + STEP_MILLISECONDS;
    const code = await codeFor(secret, later);
    expect((await checkSecondFactor(store, OWNER_ID, code, later)).ok).toBe(true);
    const replayed = await checkSecondFactor(store, OWNER_ID, code, later);
    expect(replayed.ok ? 200 : replayed.error.status).toBe(403);
  });

  it('refuses codes from outside the window', async () => {
    const { store, secret } = await enroll();
    const later = NOW + 5 * STEP_MILLISECONDS;
    const staleCode = await codeFor(secret, NOW + 2 * STEP_MILLISECONDS);
    expect((await checkSecondFactor(store, OWNER_ID, staleCode, later)).ok).toBe(false);
  });

  it('locks for five minutes after five wrong codes', async () => {
    const { store, secret } = await enroll();
    const later = NOW + STEP_MILLISECONDS;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await checkSecondFactor(store, OWNER_ID, '000000', later);
    }
    const locked = await checkSecondFactor(store, OWNER_ID, await codeFor(secret, later), later);
    expect(locked.ok ? 200 : locked.error.status).toBe(429);
    const unlockedAt = later + 5 * 60 * 1000 + STEP_MILLISECONDS;
    const unlocked = await checkSecondFactor(
      store,
      OWNER_ID,
      await codeFor(secret, unlockedAt),
      unlockedAt
    );
    expect(unlocked.ok).toBe(true);
  });
});
