import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { chromium } from 'playwright';

import { SAMPLE_API_KEY } from '@fiducy/testing';
import { EXAMPLE_APPS } from './examples';
import { STALE_KEY_MESSAGE, ask, signInAndConnectKey, waitForKeyState } from './flow';
import { EXAMPLE_REGISTRATION, buildPackages, startExample, startGateway } from './stack';

import type { Browser } from 'playwright';

const selectedNames = Bun.env.EXAMPLES?.split(',');
const examples = EXAMPLE_APPS.filter(
  (example) => !selectedNames || selectedNames.includes(example.name)
);

let gateway: Awaited<ReturnType<typeof startGateway>>;
let browser: Browser;

beforeAll(async () => {
  buildPackages();
  gateway = await startGateway();
  browser = await chromium.launch();
}, 120000);

afterAll(async () => {
  await browser.close();
  gateway.stop();
});

for (const example of examples) {
  describe(`the ${example.name} example`, () => {
    it('signs in, connects a key, answers, and heals a stale key', async () => {
      const app = await startExample(example, {
        gatewayURL: gateway.gatewayURL,
        appID: EXAMPLE_REGISTRATION.appID,
        appSecret: EXAMPLE_REGISTRATION.appSecret
      });
      const context = await browser.newContext({ viewport: { width: 360, height: 800 } });
      const page = await context.newPage();
      try {
        await signInAndConnectKey(page, app.appURL);
        expect(await page.content()).not.toContain(SAMPLE_API_KEY);
        await page.screenshot({
          path: `${Bun.env.EXAMPLES_SCREENSHOTS ?? '/tmp'}/${example.name}-connected.png`
        });

        for (const keyID of await app.readStoredKeyIDs())
          await gateway.keyStore.deleteRecord(keyID);
        await ask(page, STALE_KEY_MESSAGE);
        await page.reload();
        await waitForKeyState(page, 'connect');
      } finally {
        await context.close();
        app.stop();
      }
    }, 600000);
  });
}
