import { describe, expect, it } from 'bun:test';

import { meterRequest } from '../src';

import type { ProviderName } from '../src';

function meter(provider: ProviderName, path: string, body: object) {
  return meterRequest({ provider, path, body: JSON.stringify(body), maximumOutputTokens: 500 });
}

function readError(result: ReturnType<typeof meterRequest>) {
  return result.ok ? null : result.error;
}

function readServiceTier(result: ReturnType<typeof meterRequest>) {
  if (!result.ok) throw new Error(result.error);
  return JSON.parse(result.value.body).service_tier;
}

describe('paid speed tiers under spend limits', () => {
  it('refuses OpenAI fast, priority and ultrafast on every metered endpoint', () => {
    for (const tier of ['fast', 'priority', 'ultrafast', 'scale']) {
      const chat = meter('openai', '/v1/chat/completions', { model: 'gpt-5', service_tier: tier });
      expect(readError(chat)).toBe('tier_not_metered');
      const responses = meter('openai', '/v1/responses', { model: 'gpt-5', service_tier: tier });
      expect(readError(responses)).toBe('tier_not_metered');
    }
  });

  it('pins OpenAI to the standard tier so a Fast project default cannot apply', () => {
    const missing = meter('openai', '/v1/responses', { model: 'gpt-5', input: 'Hi' });
    expect(readServiceTier(missing)).toBe('default');
    const automatic = meter('openai', '/v1/chat/completions', { service_tier: 'auto' });
    expect(readServiceTier(automatic)).toBe('default');
    const flex = meter('openai', '/v1/chat/completions', { service_tier: 'flex' });
    expect(readServiceTier(flex)).toBe('flex');
  });

  it('refuses Anthropic fast mode and keeps standard speed', () => {
    const fast = meter('anthropic', '/v1/messages', { model: 'claude-opus-5-5', speed: 'fast' });
    expect(readError(fast)).toBe('tier_not_metered');
    const standard = meter('anthropic', '/v1/messages', { speed: 'standard' });
    expect(standard.ok).toBe(true);
    const unset = meter('anthropic', '/v1/messages', { model: 'claude-opus-5-5' });
    expect(unset.ok).toBe(true);
  });

  it('refuses Gemini priority in either spelling', () => {
    const path = '/v1beta/models/gemini-2.5-pro:generateContent';
    expect(readError(meter('gemini', path, { service_tier: 'priority' }))).toBe('tier_not_metered');
    expect(readError(meter('gemini', path, { serviceTier: 'PRIORITY' }))).toBe('tier_not_metered');
    expect(meter('gemini', path, { service_tier: 'flex' }).ok).toBe(true);
  });

  it('refuses OpenRouter priority tiers and leaves its default alone', () => {
    const path = '/api/v1/chat/completions';
    const fast = meter('openrouter', path, { model: 'openai/gpt-5', service_tier: 'fast' });
    expect(readError(fast)).toBe('tier_not_metered');
    const unset = meter('openrouter', path, { model: 'openai/gpt-5' });
    expect(readServiceTier(unset)).toBeUndefined();
  });

  it('refuses a tier that is not a string', () => {
    const odd = meter('openai', '/v1/chat/completions', { service_tier: 2 });
    expect(readError(odd)).toBe('tier_not_metered');
  });
});
