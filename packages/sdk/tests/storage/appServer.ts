import { resolve } from 'node:path';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';

import type { Fiducy } from '../../src/server';

const PAGE = `<!doctype html><html><body>
<h1>Notes chat</h1>
<div id="slot"></div>
<ul id="keys"></ul>
<button id="chat">Ask the model</button>
<button id="revoke">Disconnect key</button>
<pre id="answer"></pre>
<script type="module">
import { mountKeyWidget } from '/client.js';
const keys = document.getElementById('keys');
const answer = document.getElementById('answer');
async function showKeys() {
  const body = await (await fetch('/api/fiducy/keys')).json();
  keys.innerHTML = body.data.keys.map((key) => '<li data-key-id="' + key.keyID + '">' + key.provider + '</li>').join('');
}
mountKeyWidget({
  gatewayURL: '__GATEWAY_URL__',
  appID: '__APP_ID__',
  container: document.getElementById('slot'),
  onHandle: async (handle, record) => {
    await fetch('/api/fiducy/keys', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ provider: 'openai', handle, record })
    });
    await showKeys();
  }
});
document.getElementById('chat').onclick = async () => {
  answer.textContent = (await (await fetch('/chat', { method: 'POST' })).json()).message;
};
document.getElementById('revoke').onclick = async () => {
  const keyID = keys.querySelector('li')?.dataset.keyId;
  await fetch('/api/fiducy/keys/' + keyID, { method: 'DELETE' });
  await showKeys();
};
showKeys();
</script></body></html>`;

async function bundleWidget() {
  const build = await Bun.build({
    entrypoints: [resolve(import.meta.dir, '../../../widget/src/index.ts')],
    target: 'browser',
    format: 'esm'
  });
  return build.outputs[0]?.text();
}

async function answerChat(fiducy: Fiducy, userID: string) {
  const settings = await fiducy.providerSettings('openai', { userID });
  if (!settings.ok) return Response.json({ data: null, message: settings.message });
  const result = await generateText({
    model: createOpenAI(settings).chat('gpt-4o-mini'),
    prompt: 'hi'
  });
  return Response.json({ data: null, message: result.text });
}

export async function startAppServer(fiducy: Fiducy, gatewayURL: string, appID: string) {
  const clientScript = await bundleWidget();
  const page = PAGE.replace('__GATEWAY_URL__', gatewayURL).replace('__APP_ID__', appID);
  return Bun.serve({
    port: 0,
    fetch: (request) => {
      const { pathname } = new URL(request.url);
      if (pathname.startsWith('/api/fiducy')) return fiducy.handler(request);
      if (pathname === '/chat') return answerChat(fiducy, 'user_browser');
      if (pathname === '/client.js') {
        return new Response(clientScript, { headers: { 'content-type': 'text/javascript' } });
      }
      return new Response(page, { headers: { 'content-type': 'text/html' } });
    }
  });
}
