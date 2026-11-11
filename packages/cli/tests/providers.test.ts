import { afterAll, describe, expect, it } from 'bun:test';

import { createProject, packageWith, removeProjects, run } from './fixtures.ts';

afterAll(removeProjects);

async function initWith(dependencies: Record<string, string>) {
  const root = createProject({ 'package.json': packageWith({ next: '16.4.4', ...dependencies }) });
  return (await run(root, ['init', '--dry-run', '--show-code'])).text;
}

describe('fiducy init writes code for the provider the app uses', () => {
  it('uses Anthropic in the chat route and the key box', async () => {
    const text = await initWith({
      '@assistant-ui/react': '0.14.0',
      '@ai-sdk/anthropic': '4.0.79'
    });
    expect(text).toContain("providerSettings('anthropic', { request })");
    expect(text).toContain("model: createAnthropic(settings)('claude-sonnet-4-5')");
    expect(text).toContain("requestKey({ provider: 'anthropic' })");
    expect(text).not.toContain('.responses(');
  });

  it('uses Gemini on the settings page and in the model call', async () => {
    const text = await initWith({ '@ai-sdk/google': '4.0.95' });
    expect(text).toContain('<FiducyKey provider="gemini" />');
    expect(text).toContain("createGoogleGenerativeAI(settings)('gemini-2.5-flash')");
    expect(text).not.toContain('provider="openai"');
  });

  it('uses the OpenRouter provider package', async () => {
    const text = await initWith({ '@openrouter/ai-sdk-provider': '3.1.0' });
    expect(text).toContain("providerSettings('openrouter', { request })");
    expect(text).toContain("createOpenRouter(settings)('openai/gpt-4o-mini')");
  });

  it('names every provider an app uses and keeps the Responses note for OpenAI', async () => {
    const text = await initWith({ '@ai-sdk/openai': '4.0.93', '@ai-sdk/anthropic': '4.0.79' });
    expect(text).toContain("createOpenAI(settings).responses('gpt-4o-mini')");
    expect(text).toContain(
      "For Anthropic calls, do the same with providerSettings('anthropic') and createAnthropic(settings)."
    );
    expect(text).toContain('Use .responses(...), not .chat(...)');
  });

  it('defaults to OpenAI when no provider package is installed', async () => {
    const text = await initWith({});
    expect(text).toContain("providerSettings('openai', { request })");
    expect(text).toContain('<FiducyKey provider="openai" />');
  });
});
