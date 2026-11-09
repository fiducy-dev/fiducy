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

describe('fiducy prompt for a coding agent', () => {
  it('uses the drizzle-kit flow the app already has and names the schema export', async () => {
    const files = {
      'package.json': packageWith({ next: '16.4.4', 'drizzle-orm': '0.45.0' }),
      'pnpm-lock.yaml': '',
      'src/db/index.ts': 'export const db = drizzle(client);\n',
      'drizzle.config.ts': "export default { dialect: 'sqlite', schema: './src/db/schema.ts' };\n"
    };
    const pushed = await run(createProject(files), ['prompt']);
    expect(pushed.text).toContain(`\`pnpm dlx fiducy@${CLI_VERSION} generate\``);
    expect(pushed.text).toContain("add export * from './fiducy-schema' to ./src/db/schema.ts");
    expect(pushed.text).toContain('`pnpm exec drizzle-kit push` creates the table');
    expect(pushed.text).not.toContain('drizzle-kit migrate');
    const migrated = await run(createProject({ ...files, 'drizzle/meta/_journal.json': '{}' }), [
      'prompt'
    ]);
    expect(migrated.text).toContain('`pnpm exec drizzle-kit generate` writes the migration');
    expect(migrated.text).toContain('`pnpm exec drizzle-kit migrate` applies it');
  });

  it('spells out the dev gateway, the old provider key and a done check', async () => {
    const root = createProject({ 'package.json': packageWith(ASSISTANT_UI_APP) });
    const result = await run(root, ['prompt']);
    expect(result.text).toContain('keep it running in the background');
    expect(result.text).toContain('Restart the dev server after env changes');
    expect(result.text).toContain('OPENAI_API_KEY');
    expect(result.text).toContain("Keep the app's model, request variable and API style");
    expect(result.text).toContain(
      'Done when: signed in, a message without a key shows the key box'
    );
    expect(result.text).not.toContain('editing only what each one names');
  });
});
