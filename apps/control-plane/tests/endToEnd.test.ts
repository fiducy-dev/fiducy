import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { base32 } from '@better-auth/utils/base32';
import { createOTP } from '@better-auth/utils/otp';
import OpenAI from 'openai';
import { chromium } from 'playwright';

import { parseHandle } from '@fiducy/core';
import { SAMPLE_API_KEY } from '@fiducy/testing';
import { startStack } from './stack';

import type { Browser, Page } from 'playwright';

const ALLOWED_ORIGIN = 'https://chatforge.example';

let stack: Awaited<ReturnType<typeof startStack>>;
let browser: Browser;

beforeAll(async () => {
  stack = await startStack();
  browser = await chromium.launch();
}, 90000);

afterAll(async () => {
  await browser.close();
  await stack.stop();
});

async function signUp(page: Page, email: string) {
  await page.goto(`${stack.controlPlaneURL}/sign-up`);
  await page.getByLabel('Name').fill('Ben');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('correct-horse-battery');
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.getByRole('heading', { name: 'Your apps' }).waitFor({ timeout: 30000 });
}

async function createAppInDashboard(page: Page) {
  await page.getByLabel('App name').fill('Chatforge');
  await page.getByLabel('Allowed origins').fill(ALLOWED_ORIGIN);
  await page.getByRole('button', { name: 'Create app' }).click();
  const appSecret = (await page.getByTestId('app-secret').textContent({ timeout: 30000 })) ?? '';
  const appID = (await page.locator('code', { hasText: /^app_/ }).first().textContent()) ?? '';
  return { appID, appSecret };
}

async function storeUserKey(appID: string) {
  const response = await fetch(`${stack.gatewayURL}/keys`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ appID, apiKey: SAMPLE_API_KEY })
  });
  const body = (await response.json()) as { data: { handle: string } };
  return body.data.handle;
}

async function createCode(secret: string, stepOffset: number) {
  const step = Math.floor(Date.now() / 30000) + stepOffset;
  return createOTP(base32.decode(secret), { period: 30 }).hotp(step);
}

async function turnOnTwoFactor(page: Page) {
  const secret = await page.evaluate(async () => {
    const response = await fetch('/api/two-factor', { method: 'POST' });
    const body = (await response.json()) as { data: { secret: string } };
    return body.data.secret;
  });
  const code = await createCode(secret, 0);
  const status = await page.evaluate(async (confirmCode) => {
    const response = await fetch('/api/two-factor/confirm', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code: confirmCode })
    });
    return response.status;
  }, code);
  expect(status).toBe(200);
  return createCode(secret, 1);
}

describe('a developer onboarding through the dashboard', () => {
  let created: { appID: string; appSecret: string };
  let servedHandle = '';
  let page: Page;

  beforeAll(async () => {
    page = await browser.newPage();
    await signUp(page, 'ben@chatforge.example');
    created = await createAppInDashboard(page);
  }, 90000);

  it('shows the new secret once and lists the app by its preview only', async () => {
    expect(created.appID).toMatch(/^app_/);
    expect(created.appSecret).toMatch(/^fsk_/);
    await page.reload();
    await page.getByRole('main').getByRole('link', { name: 'Chatforge' }).waitFor();
    expect(await page.content()).not.toContain(created.appSecret);
  });

  it('lets the gateway serve the app as soon as it is created', async () => {
    const handle = await storeUserKey(created.appID);
    servedHandle = handle;
    const openai = new OpenAI({
      apiKey: created.appSecret,
      baseURL: `${stack.gatewayURL}/openai/v1`,
      defaultHeaders: { 'x-key-handle': handle }
    });
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Hello' }]
    });
    expect(completion.choices[0]?.message.content).toBeTruthy();
  });

  it('applies the default spend limits from the dashboard in the gateway', async () => {
    const response = await fetch(`${stack.gatewayURL}/openai/v1/files`, {
      method: 'POST',
      headers: { authorization: `Bearer ${created.appSecret}`, 'x-key-handle': servedHandle },
      body: '{}'
    });
    expect(response.status).toBe(403);
  });

  it('lets a user revoke their key through the gateway', async () => {
    const handle = await storeUserKey(created.appID);
    const parsed = parseHandle(handle);
    if (!parsed.ok) throw new Error('Expected a valid handle');
    const revoked = await fetch(`${stack.gatewayURL}/keys/${parsed.value.keyID}`, {
      method: 'DELETE',
      headers: { authorization: `Bearer ${created.appSecret}` }
    });
    expect(revoked.status).toBe(200);
    const response = await fetch(`${stack.gatewayURL}/openai/v1/chat/completions`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${created.appSecret}`,
        'x-key-handle': handle,
        'content-type': 'application/json'
      },
      body: JSON.stringify({ model: 'gpt-4o-mini', messages: [] })
    });
    expect(response.status).toBe(404);
  });

  it('shows the request in the app usage after the gateway reports it', async () => {
    expect(await stack.usageLedger.flush()).toBe(1);
    await page.getByRole('main').getByRole('link', { name: 'Chatforge' }).click();
    await page.getByTestId('request-count').filter({ hasText: '1' }).waitFor({ timeout: 30000 });
  });

  it('lists the user key and revokes it so the gateway refuses it', async () => {
    const callDashboard = (path: string, method = 'GET') =>
      page.evaluate(
        async ([url, verb]) => {
          const response = await fetch(url ?? '', { method: verb });
          return { status: response.status, body: await response.json() };
        },
        [path, method]
      );
    const keys = await callDashboard(`/api/apps/${created.appID}/keys`);
    expect(keys.status).toBe(200);
    const listed = keys.body.data as Array<{ keyID: string; status: string }>;
    expect(listed.map((key) => key.status).sort()).toEqual(['active', 'revoked']);
    const usedKey = listed.find((key) => key.status === 'active');
    expect(usedKey).toMatchObject({ provider: 'openai', requestCount: 1 });
    const keyID = usedKey?.keyID;
    const series = await callDashboard(`/api/apps/${created.appID}/usage/series?days=7`);
    expect(series.body.data.byProvider).toMatchObject([{ provider: 'openai', requestCount: 1 }]);
    const status = await callDashboard('/api/gateway-status');
    expect(status.body.data.reachable).toBe(true);

    const revoked = await callDashboard(`/api/apps/${created.appID}/keys/${keyID}`, 'DELETE');
    expect(revoked.status).toBe(200);
    const after = await callDashboard(`/api/apps/${created.appID}/keys`);
    const statusesAfter = (after.body.data as Array<{ status: string }>).map((key) => key.status);
    expect(statusesAfter).toEqual(['revoked', 'revoked']);
  });

  it('hides the app from other developers', async () => {
    const otherPage = await browser.newPage();
    await signUp(otherPage, 'mallory@elsewhere.example');
    await otherPage.getByText('No apps yet').waitFor({ timeout: 30000 });
    const response = await otherPage.request.get(
      `${stack.controlPlaneURL}/api/apps/${created.appID}`
    );
    expect(response.status()).toBe(404);
    await otherPage.close();
  });
});

describe('a developer managing an app', () => {
  it('rotates the secret and deletes the app through bodiless requests', async () => {
    const page = await browser.newPage();
    await signUp(page, 'ops@chatforge.example');
    const { appID } = await createAppInDashboard(page);
    const refusedStatus = await page.evaluate(async (id) => {
      const response = await fetch(`/api/apps/${id}`, { method: 'DELETE' });
      return response.status;
    }, appID);
    expect(refusedStatus).toBe(403);
    const code = await turnOnTwoFactor(page);
    const statuses = await page.evaluate(
      async ([id, deleteCode]) => {
        const rotated = await fetch(`/api/apps/${id}/secret`, { method: 'POST' });
        const deleted = await fetch(`/api/apps/${id}`, {
          method: 'DELETE',
          headers: { 'x-fiducy-otp': deleteCode }
        });
        return [rotated.status, deleted.status];
      },
      [appID, code] as const
    );
    expect(statuses).toEqual([200, 200]);
    await page.close();
  }, 90000);
});

describe('a developer responding to a breach', () => {
  it('freezes the app at once, lets its secret freeze it, and revokes every key', async () => {
    const page = await browser.newPage();
    await signUp(page, 'oncall@chatforge.example');
    const { appID, appSecret } = await createAppInDashboard(page);
    const handle = await storeUserKey(appID);
    const callGateway = () =>
      fetch(`${stack.gatewayURL}/openai/v1/chat/completions`, {
        method: 'POST',
        headers: { authorization: `Bearer ${appSecret}`, 'x-key-handle': handle },
        body: JSON.stringify({ model: 'gpt-4o-mini', messages: [] })
      });
    const setFrozen = (isFrozen: boolean) =>
      page.evaluate(
        async ([id, frozen]) => {
          const response = await fetch(`/api/apps/${id}/freeze`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ isFrozen: frozen })
          });
          return response.status;
        },
        [appID, isFrozen] as const
      );

    expect((await callGateway()).status).toBe(200);
    expect(await setFrozen(true)).toBe(200);
    expect((await callGateway()).status).toBe(403);
    expect(await setFrozen(false)).toBe(200);
    expect((await callGateway()).status).toBe(200);

    const frozenBySecret = await fetch(`${stack.controlPlaneURL}/api/freeze`, {
      method: 'POST',
      headers: { authorization: `Bearer ${appSecret}` }
    });
    expect(frozenBySecret.status).toBe(200);
    expect((await callGateway()).status).toBe(403);
    const unfreezeBySecret = await fetch(`${stack.controlPlaneURL}/api/apps/${appID}/freeze`, {
      method: 'POST',
      headers: { authorization: `Bearer ${appSecret}`, 'content-type': 'application/json' },
      body: JSON.stringify({ isFrozen: false })
    });
    expect(unfreezeBySecret.status).toBe(401);

    expect(await setFrozen(false)).toBe(200);
    const code = await turnOnTwoFactor(page);
    const revoked = await page.evaluate(
      async ([id, revokeCode]) => {
        const response = await fetch(`/api/apps/${id}/keys`, {
          method: 'DELETE',
          headers: { 'x-fiducy-otp': revokeCode }
        });
        return response.json();
      },
      [appID, code] as const
    );
    expect(revoked.data).toEqual({ revokedCount: 1, failedCount: 0 });
    expect((await callGateway()).status).toBe(404);
    await page.close();
  }, 90000);
});

describe('control plane access rules', () => {
  it('refuses the gateway feed without the gateway token', async () => {
    const response = await fetch(`${stack.controlPlaneURL}/api/gateway/apps`, {
      headers: { authorization: 'Bearer wrong_token' }
    });
    expect(response.status).toBe(401);
  });

  it('refuses app management without a session', async () => {
    const response = await fetch(`${stack.controlPlaneURL}/api/apps`);
    expect(response.status).toBe(401);
  });
});
