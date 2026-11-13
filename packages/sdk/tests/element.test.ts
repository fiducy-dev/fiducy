import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { chromium } from 'playwright';

import { SAMPLE_API_KEY } from '@fiducy/testing';
import { startGatewayHarness } from '../../../apps/gateway/tests/harness';
import { startElementApp } from './browser/appServer';

import type { Browser, Page } from 'playwright';
import type { AppRegistration } from '../../../apps/gateway/src/types';
import type { GatewayHarness } from './fixtures';

const ELEMENT_APP: AppRegistration = {
  appID: 'app_element_test',
  name: 'Notes',
  appSecret: 'fsk_element_test_4Tz8Qm2Wx6Ly',
  monthlyRequestLimitPerKey: 100,
  allowedOrigins: []
};

let harness: GatewayHarness;
let elementApp: Awaited<ReturnType<typeof startElementApp>>;
let browser: Browser;

beforeAll(async () => {
  harness = await startGatewayHarness([ELEMENT_APP]);
  elementApp = await startElementApp(harness, ELEMENT_APP);
  ELEMENT_APP.allowedOrigins.push(elementApp.appURL);
  browser = await chromium.launch();
}, 60000);

afterAll(async () => {
  await browser.close();
  elementApp.server.stop(true);
  harness.stop();
});

async function openPage(path: string, user: string | null): Promise<Page> {
  const context = await browser.newContext({ viewport: { width: 360, height: 740 } });
  if (user) {
    await context.addCookies([
      { name: elementApp.userCookie, value: user, url: elementApp.appURL }
    ]);
  }
  const page = await context.newPage();
  await page.goto(`${elementApp.appURL}${path}`);
  return page;
}

function waitForState(page: Page, state: string) {
  return page.locator(`fiducy-key[state="${state}"]`).waitFor({ timeout: 15000 });
}

async function saveKeyInWidget(page: Page) {
  await waitForState(page, 'connect');
  const widget = page.frameLocator('fiducy-key iframe');
  await widget.getByLabel('Your API key').fill(SAMPLE_API_KEY);
  await widget.getByRole('button', { name: 'Save key' }).click();
  await waitForState(page, 'connected');
}

function readEvents(page: Page) {
  return page.evaluate('window.events') as Promise<{ type: string; detail: unknown }[]>;
}

describe('<fiducy-key> with no config in the browser', () => {
  it('asks a signed-out visitor to sign in', async () => {
    const page = await openPage('/element', null);
    await waitForState(page, 'signed-out');
    expect(await page.getByText('Sign in to connect your OpenAI key.').isVisible()).toBe(true);
    await page.context().close();
  }, 30000);

  it('connects, replaces and removes a key for a signed-in user', async () => {
    const page = await openPage('/element', 'element_user');
    await saveKeyInWidget(page);
    expect(await page.getByText('OpenAI key connected').isVisible()).toBe(true);
    expect(await page.content()).not.toContain(SAMPLE_API_KEY);
    const settings = await elementApp.fiducy.providerSettings('openai', { userID: 'element_user' });
    expect(settings.ok).toBe(true);

    await page.getByRole('button', { name: 'Replace' }).click();
    await waitForState(page, 'connect');
    await page.getByRole('button', { name: 'Keep current key' }).click();
    await waitForState(page, 'connected');

    const [key] = await elementApp.fiducy.listKeys('element_user');
    await page.getByRole('button', { name: 'Remove' }).click();
    await waitForState(page, 'connect');
    expect(await elementApp.fiducy.listKeys('element_user')).toEqual([]);
    expect(await harness.keyStore.findRecord(key?.keyID ?? '')).toBeNull();
    const eventTypes = (await readEvents(page)).map((event) => event.type);
    expect(eventTypes).toEqual(['fiducy:connected', 'fiducy:removed']);
    await page.context().close();
  }, 30000);

  it('shows the user as connected on the next visit', async () => {
    const page = await openPage('/element', 'returning_user');
    await saveKeyInWidget(page);
    await page.reload();
    await waitForState(page, 'connected');
    await page.context().close();
  }, 30000);

  it('refuses to show the key box for a remote gateway with no expected PCR0', async () => {
    const query = `gatewayURL=https://gateway.notesapp.dev&appID=${ELEMENT_APP.appID}`;
    const page = await openPage(`/element?${query}`, 'user_remote');
    await waitForState(page, 'error');
    expect(await page.getByText('Set FIDUCY_ENCLAVE_PCR0').isVisible()).toBe(true);
    expect(await page.locator('fiducy-key iframe').count()).toBe(0);
    await page.context().close();
  });

  it('refuses a gateway that cannot prove which enclave it runs', async () => {
    const parameters = new URLSearchParams({
      gatewayURL: harness.gatewayURL,
      appID: ELEMENT_APP.appID,
      enclavePCR0: 'ab'.repeat(48),
      enclavePCR16: '11'.repeat(48)
    });
    const page = await openPage(`/element?${parameters}`, 'user_unproven');
    await waitForState(page, 'error');
    const refusal = page.getByText('did not return an attestation document. No key was sent.');
    expect(await refusal.isVisible()).toBe(true);
    expect(await page.locator('fiducy-key iframe').count()).toBe(0);
    await page.context().close();
  });

  it('says where the route is missing and which attribute is wrong', async () => {
    const wrongPath = await openPage('/element?basePath=/api/keys', 'element_user');
    await waitForState(wrongPath, 'error');
    expect(
      await wrongPath.getByText('No Fiducy route answers at /api/keys/config').isVisible()
    ).toBe(true);
    await wrongPath.context().close();
    const noProvider = await openPage('/element?provider=none', 'element_user');
    await waitForState(noProvider, 'error');
    expect(await noProvider.getByText('Set provider on <fiducy-key>').isVisible()).toBe(true);
    await noProvider.context().close();
  }, 30000);
});

describe('framework wrappers over <fiducy-key>', () => {
  for (const wrapper of ['react', 'vue', 'solid', 'svelte']) {
    it(`saves a key and reports it through the ${wrapper} wrapper`, async () => {
      const user = `${wrapper}_user`;
      const page = await openPage(`/${wrapper}`, user);
      await saveKeyInWidget(page);
      await page.getByRole('button', { name: 'Remove' }).click();
      await waitForState(page, 'connect');
      const eventTypes = (await readEvents(page)).map((event) => event.type);
      expect(eventTypes).toEqual(['connected', 'removed']);
      await page.context().close();
    }, 30000);
  }
});
