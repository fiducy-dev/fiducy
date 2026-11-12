import { afterAll, describe, expect, it } from 'bun:test';
import { readFileSync, statSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { join } from 'node:path';

import { SAMPLE_API_KEY } from '@fiducy/testing';
import { reportEnvironment, runDev, startDevGateway } from '../src/commands/dev.ts';
import { describeExposedSecret } from '../src/dev/secretGuard.ts';
import { serveOnLocalhost } from '../src/dev/server.ts';
import { createStyle } from '../src/style.ts';
import { createProject, removeProjects } from './fixtures.ts';

import type { Output } from '../src/types.ts';

afterAll(removeProjects);

const silent: Output = { info: () => undefined, error: () => undefined, style: createStyle(false) };

function choosePort(): number {
  return 20000 + Math.floor(Math.random() * 20000);
}

async function storeKey(url: string, appID: string) {
  const response = await fetch(`${url}/keys`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ appID, apiKey: SAMPLE_API_KEY })
  });
  return (await response.json()) as { data: { handle: string } };
}

function chat(url: string, appSecret: string, handle: string) {
  return fetch(`${url}/openai/v1/chat/completions`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${appSecret}`,
      'x-key-handle': handle,
      'content-type': 'application/json'
    },
    body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: 'hi' }] })
  });
}

describe('fiducy dev', () => {
  it('adds missing env lines, swaps stale dev values and leaves real ones alone', () => {
    const lines = [
      'FIDUCY_GATEWAY_URL=http://localhost:3438',
      'FIDUCY_APP_ID=app_dev_new',
      'FIDUCY_APP_SECRET=fsk_dev_new'
    ];
    const root = createProject({ '.env': 'EXAMPLE_SESSION_SECRET=kept' });
    const printed: string[] = [];
    reportEnvironment(root, lines, { ...silent, info: (line) => printed.push(line) });
    expect(readFileSync(join(root, '.env'), 'utf8')).toBe(
      `EXAMPLE_SESSION_SECRET=kept\n${lines.join('\n')}\n`
    );
    expect(printed.join('\n')).toContain(
      'added FIDUCY_GATEWAY_URL, FIDUCY_APP_ID, FIDUCY_APP_SECRET to .env'
    );

    const stale = createProject({
      '.env.local':
        'FIDUCY_GATEWAY_URL=http://localhost:3438\nFIDUCY_APP_ID=app_dev_old\nFIDUCY_APP_SECRET=fsk_dev_old\nOTHER=1\n'
    });
    reportEnvironment(stale, lines, silent);
    expect(readFileSync(join(stale, '.env.local'), 'utf8')).toBe(`${lines.join('\n')}\nOTHER=1\n`);

    const real = createProject({ '.env': 'FIDUCY_APP_ID=app_live\n' });
    reportEnvironment(real, lines, silent);
    expect(readFileSync(join(real, '.env'), 'utf8')).toBe('FIDUCY_APP_ID=app_live\n');
  });

  it('keeps its secrets private and its keys across restarts', async () => {
    const root = createProject({});
    const port = choosePort();
    const first = await startDevGateway(root, { port, origins: [], mock: true }, silent);
    const { data } = await storeKey(first.url, first.state.appID);
    await first.close();

    expect(statSync(join(root, '.fiducy')).mode & 0o777).toBe(0o700);
    expect(statSync(join(root, '.fiducy/dev.json')).mode & 0o777).toBe(0o600);
    expect(statSync(join(root, '.fiducy/dev-records.json')).mode & 0o777).toBe(0o600);
    expect(readFileSync(join(root, '.fiducy/.gitignore'), 'utf8')).toBe('*\n');
    expect(readFileSync(join(root, '.fiducy/dev-records.json'), 'utf8')).not.toContain(
      SAMPLE_API_KEY
    );

    const second = await startDevGateway(root, { origins: [], mock: true }, silent);
    expect(second.state).toEqual(first.state);
    const widget = await fetch(
      `${second.url}/widget?app=${second.state.appID}&origin=http://localhost:5173`
    );
    expect(await widget.text()).toContain('Enter a made-up key, not a real one.');
    const response = await chat(second.url, second.state.appSecret, data.handle);
    expect(response.status).toBe(200);
    const wrongSecret = await chat(second.url, 'fsk_dev_wrong', data.handle);
    expect(wrongSecret.status).toBe(401);
    await second.close();
  });

  it('answers Gemini and OpenRouter calls with --mock', async () => {
    const gateway = await startDevGateway(
      createProject({}),
      { port: choosePort(), origins: [], mock: true },
      silent
    );
    const { data } = await storeKey(gateway.url, gateway.state.appID);
    const headers = {
      'content-type': 'application/json',
      authorization: `Bearer ${gateway.state.appSecret}`,
      'x-key-handle': data.handle
    };
    const gemini = await fetch(
      `${gateway.url}/gemini/v1beta/models/gemini-2.5-flash:generateContent`,
      { method: 'POST', headers, body: JSON.stringify({ contents: [] }) }
    );
    const openrouter = await fetch(`${gateway.url}/openrouter/api/v1/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ model: 'openai/gpt-4o-mini', messages: [] })
    });
    expect(gemini.status).toBe(200);
    expect(openrouter.status).toBe(200);
    await gateway.close();
  });

  it('listens on loopback only', async () => {
    const root = createProject({});
    const gateway = await startDevGateway(
      root,
      { port: choosePort(), origins: [], mock: false },
      silent
    );
    const health = await fetch(`http://127.0.0.1:${gateway.state.port}/health`);
    expect(health.status).toBe(200);
    const external = Object.values(networkInterfaces())
      .flat()
      .find((address) => address && address.family === 'IPv4' && !address.internal);
    if (external) {
      const outside = await fetch(`http://${external.address}:${gateway.state.port}/health`).catch(
        () => null
      );
      expect(outside).toBeNull();
    }
    await gateway.close();
  });

  it('explains how to allow an origin the widget is not allowed on', async () => {
    const lines: string[] = [];
    const output = {
      info: () => undefined,
      error: (line: string) => lines.push(line),
      style: createStyle(false)
    };
    const root = createProject({});
    const gateway = await startDevGateway(
      root,
      { port: choosePort(), origins: ['http://localhost:4999'], mock: false },
      output
    );
    const app = `app=${gateway.state.appID}`;
    const blocked = await fetch(`${gateway.url}/widget?${app}&origin=http://localhost:5999`);
    expect(blocked.status).toBe(403);
    expect(await blocked.text()).toContain('npx fiducy dev --origin http://localhost:5999');
    expect(lines.join('\n')).toContain('--origin http://localhost:5999');
    const allowed = await fetch(`${gateway.url}/widget?${app}&origin=http://localhost:4999`);
    expect(allowed.status).toBe(200);
    expect(await allowed.text()).toContain('No enclave');
    const common = await fetch(`${gateway.url}/widget?${app}&origin=http://localhost:5173`);
    expect(common.status).toBe(200);
    await gateway.close();
  });

  it('does not answer fake model calls without --mock', async () => {
    const root = createProject({});
    const gateway = await startDevGateway(
      root,
      { port: choosePort(), origins: [], mock: false },
      silent
    );
    const response = await fetch(`${gateway.url}/v1/chat/completions`, { method: 'POST' });
    expect(response.status).toBe(404);
    await gateway.close();
  });

  it('reports a busy port', async () => {
    const port = choosePort();
    const taken = await serveOnLocalhost(async () => new Response('busy'), '127.0.0.1', port);
    const root = createProject({});
    await expect(startDevGateway(root, { port, origins: [], mock: false }, silent)).rejects.toThrow(
      String(port)
    );
    await taken.close();
  });
});

describe('fiducy dev refuses a public app secret', () => {
  it('names the variable and the file, and does not start', async () => {
    const root = createProject({ '.env.local': 'NEXT_PUBLIC_FIDUCY_APP_SECRET=fsk_dev_x\n' });
    const errors: string[] = [];
    const output: Output = { ...silent, error: (message) => errors.push(message) };
    const code = await runDev([], { cwd: root, output, environment: {} });
    expect(code).toBe(1);
    expect(errors[0]).toContain('NEXT_PUBLIC_FIDUCY_APP_SECRET in .env.local is a public env var');
    expect(errors[0]).not.toContain('fsk_dev_x');
  });

  it('starts when the secret has its private name', () => {
    const root = createProject({ '.env': 'FIDUCY_APP_SECRET=fsk_dev_x\nVITE_APP_NAME=demo\n' });
    expect(describeExposedSecret(root)).toBeNull();
  });
});
