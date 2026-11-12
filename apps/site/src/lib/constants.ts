export const GITHUB_URL = 'https://github.com/fiducy-dev/fiducy';
export const DEMO_URL: string | null = import.meta.env.VITE_FIDUCY_DEMO_URL ?? null;
export const DASHBOARD_URL: string | null = import.meta.env.VITE_FIDUCY_DASHBOARD_URL ?? null;
export const INSTALL_COMMAND = 'npm install @fiducy/sdk';
export const PROVIDERS = ['OpenAI', 'Anthropic', 'Gemini', 'OpenRouter'] as const;
export const REQUEST_TRACE = [
  { step: 'handle received', detail: 'kh_9f2c…' },
  { step: 'enclave attested', detail: 'PCR0 a41e…' },
  { step: 'key opened', detail: 'in memory' },
  { step: 'openai', detail: '200 · streamed' },
  { step: 'key dropped', detail: 'request ended' }
];

export const SHOWCASE_CODE = `import { createFiducy } from '@fiducy/sdk/server';
import { kyselyStorage } from '@fiducy/sdk/storage/kysely';

export const fiducy = createFiducy({
  storage: kyselyStorage(pool),
  getUserID: readSessionUser
});`;
export const SHOWCASE_KEY = 'sk-proj-7Tq2m9Lx4bVn8cRk0wXWYZ';
export const SHOWCASE_QUESTION = 'Summarize this contract in three lines.';
export const SHOWCASE_ANSWER =
  'The vendor licenses the software for 12 months, renews automatically, and either side can end it with 30 days notice.';
export const SHOWCASE_STEPS = [
  { value: 'key', label: 'Connect key' },
  { value: 'ask', label: 'Ask' },
  { value: 'answer', label: 'Answer' }
] as const;
export const ENCLAVE_STEPS = [
  "Your app keeps one half of the user's key. On its own, it opens nothing.",
  'Fiducy keeps the other half, locked inside a sealed AWS enclave.',
  'For a single request, the two halves meet inside the enclave and call the AI provider.',
  'Then the key is wiped. A leak on either side exposes only half a key, which is useless.'
];
