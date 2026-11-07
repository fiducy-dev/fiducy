import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { chromium } from 'playwright';

import { SAMPLE_API_KEY } from '@fiducy/testing';
import { startGatewayHarness } from '../../../../apps/gateway/tests/harness';
import { createFiducy } from '../../src/server';
import { startAppServer } from './appServer';
import { STORAGE_SETUPS } from './setups';

import type { Browser } from 'playwright';
import type { AppRegistration } from '../../../../apps/gateway/src/types';
import type { FiducyStorage } from '../../src/server';
import type { OpenedStorage } from './types';

const BROWSER_APP: AppRegistration = {
  appID: 'app_notes_storage',
  name: 'Notes chat',
  appSecret: 'app_sk_notes_storage_5Tz8Qm',
  monthlyRequestLimitPerKey: 100,
  allowedOrigins: []
};

let harness: Awaited<ReturnType<typeof startGatewayHarness>>;
let browser: Browser;

beforeAll(async () => {
  harness = await startGatewayHarness([BROWSER_APP]);
  browser = await chromium.launch();
}, 30000);

afterAll(async () => {
  await browser.close();
  harness.stop();
});

for (const setup of STORAGE_SETUPS) {
  describe.skipIf(!setup.isAvailable)(`the key widget with ${setup.label}`, () => {
    let storage: FiducyStorage;
    let opened: OpenedStorage;
    let appServer: Awaited<ReturnType<typeof startAppServer>>;

    beforeAll(async () => {
      opened = await setup.open();
      storage = opened.storage;
      const fiducy = createFiducy({
        gatewayURL: harness.gatewayURL,
        appSecret: BROWSER_APP.appSecret,
        storage,
        getUserID: () => 'user_browser'
      });
      appServer = await startAppServer(fiducy, harness.gatewayURL, BROWSER_APP.appID);
      BROWSER_APP.allowedOrigins.push(`http://localhost:${appServer.port}`);
    }, 60000);

    afterAll(async () => {
      appServer.stop(true);
      await opened.close();
    });

    it('saves the handle in the database, chats with it, and removes it on disconnect', async () => {
      const page = await browser.newPage();
      await page.goto(`http://localhost:${appServer.port}/`);
      const widget = page.frameLocator('iframe');
      await widget.getByLabel('Your API key').fill(SAMPLE_API_KEY);
      await widget.getByRole('button', { name: 'Save key' }).click();
      await page.locator('#keys li').waitFor();
      const [stored] = await storage.listKeys('user_browser');
      expect(stored?.provider).toBe('openai');
      expect(await page.content()).not.toContain(stored?.handle ?? 'missing');
      await page.click('#chat');
      await page.waitForFunction(() => document.getElementById('answer')?.textContent === 'Hello');
      await page.click('#revoke');
      await page.locator('#keys li').waitFor({ state: 'detached' });
      expect(await storage.listKeys('user_browser')).toEqual([]);
      expect(await harness.keyStore.findRecord(stored?.keyID ?? '')).toBeNull();
      await page.close();
    }, 30000);
  });
}
