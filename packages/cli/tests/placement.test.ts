import { afterAll, describe, expect, it } from 'bun:test';

import { CLI_VERSION } from '../src/constants.ts';
import { createProject, packageWith, removeProjects, run } from './fixtures.ts';

afterAll(removeProjects);

const ASSISTANT_UI_APP = {
  next: '16.4.4',
  '@assistant-ui/react': '0.14.0',
  '@ai-sdk/react': '3.0.0'
};

describe('fiducy init key box placement', () => {
  it('puts the key box in an assistant-ui thread by default', async () => {
    const root = createProject({ 'package.json': packageWith(ASSISTANT_UI_APP) });
    const result = await run(root, ['init', '--dry-run', '--show-code']);
    expect(result.text).toContain('Key box goes in the chat');
    expect(result.text).toContain("return requestKey({ provider: 'openai' });");
    expect(result.text).toContain('fiducyToolkit()');
    expect(result.text).toContain(`@fiducy/assistant-ui@${CLI_VERSION}`);
    expect(result.text).not.toContain('<FiducyKey provider="openai" />');
    expect(result.text).toContain('https://fiducy.dev/docs/assistant-ui');
  });

  it('shows the key box under a useChat thread when the request fails', async () => {
    const root = createProject({
      'package.json': packageWith({ next: '16.4.4', '@ai-sdk/react': '3.0.0' })
    });
    const result = await run(root, ['init', '--dry-run', '--show-code']);
    expect(result.text).toContain('Show the key box in the chat when a key is missing');
    expect(result.text).toContain('readMissingProvider(error)');
    expect(result.text).not.toContain('@fiducy/assistant-ui');
  });

  it('uses the settings page when the app has no chat UI', async () => {
    const root = createProject({ 'package.json': packageWith({ next: '16.4.4' }) });
    const result = await run(root, ['init', '--dry-run']);
    expect(result.text).toContain('Key box goes on the settings page');
    expect(result.text).toContain('Show the key widget on the settings page');
    expect(result.text).not.toContain('No chat UI found');
  });

  it('falls back to settings when chat is asked for without a chat UI', async () => {
    const root = createProject({ 'package.json': packageWith({ next: '16.4.4' }) });
    const result = await run(root, ['init', '--dry-run', '--widget', 'chat']);
    expect(result.text).toContain('Key box goes on the settings page');
    expect(result.text).toContain('No chat UI found');
  });

  it('puts the key box on a named route and rejects anything else', async () => {
    const root = createProject({ 'package.json': packageWith(ASSISTANT_UI_APP) });
    const result = await run(root, ['init', '--dry-run', '--widget', '/account']);
    expect(result.text).toContain('Key box goes on the /account page');
    expect(result.text).toContain('Show the key widget on /account');
    expect(result.text).not.toContain('requestKey');
    const bad = await run(root, ['init', '--dry-run', '--widget', 'header']);
    expect(bad.code).toBe(1);
    expect(bad.text).toContain('--widget header is not chat, settings or a route');
  });

  it('asks in a terminal, defaulting to the detected place', async () => {
    const root = createProject({ 'package.json': packageWith(ASSISTANT_UI_APP) });
    const picked = await run(root, ['init', '--dry-run'], ['']);
    expect(picked.text).toContain('Where should users add their AI key?');
    expect(picked.text).toContain('found assistant-ui');
    expect(picked.text).toContain('Key box goes in the chat');
    const named = await run(root, ['init', '--dry-run'], ['3', 'not a route', 'billing']);
    expect(named.text).toContain('not a route is not a route');
    expect(named.text).toContain('Key box goes on the /billing page');
  });

  it('tells the coding agent where the key box goes and where it never goes', async () => {
    const root = createProject({ 'package.json': packageWith(ASSISTANT_UI_APP) });
    const result = await run(root, ['prompt', '--widget', 'settings']);
    expect(result.text).toContain('Put the key box on the settings page, and nowhere else.');
    expect(result.text).toContain('Never put it in a header, nav bar, sidebar or root layout.');
    expect(result.text).toContain(".responses('gpt-4o-mini')");
  });
});
