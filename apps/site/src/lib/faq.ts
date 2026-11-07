import type { FaqItem } from '@/types';

export const FAQ: FaqItem[] = [
  {
    question: 'What is bring-your-own-key, and why does custody matter?',
    answer:
      'Bring-your-own-key (BYOK) means your users pay OpenAI, Anthropic, Gemini or OpenRouter directly with their own API key instead of you reselling tokens. The hard part is holding those keys: one database leak or one logged request exposes every key you stored. Fiducy takes custody off your hands so a breach of your app leaks nothing usable.'
  },
  {
    question: 'Why not just encrypt the keys in my own database?',
    answer:
      'Because whatever decrypts them sits next to them. Your server holds the encryption key (or can call KMS for it), so anyone who breaks into that server, reads its env vars or gets an insider login can decrypt every stored key in one go. Each request also puts the plaintext key in your app memory, where logs and error trackers can catch it. With Fiducy your app never holds a plaintext key or anything that can decrypt one: it keeps a handle that only works through the gateway, and the gateway only decrypts inside an enclave that KMS trusts by its exact image. A full breach of your app lets an attacker make calls through the gateway until you revoke, within your limits, but not walk away with a single key.'
  },
  {
    question: 'Does Fiducy ever see the plaintext key?',
    answer:
      'Only inside a sealed AWS Nitro enclave, for the length of one request. The key is split in two: your app keeps one half as a handle, the enclave keeps the other half sealed with KMS. Neither half opens anything alone, the gateway stores no plaintext, and operators, including AWS admins, cannot read enclave memory.'
  },
  {
    question: 'How do I add it to an existing app?',
    answer:
      'Run npx fiducy init in your app: it adds the server module and key route for your framework and installs the SDK. Then drop the key widget into your settings page. Your model calls keep using the AI SDK or the provider client you already have; they simply receive provider settings from Fiducy instead of a key from your database. Most apps finish in an afternoon, and a coding agent can do it from the setup prompt on this page.'
  },
  {
    question: 'How can my users verify the enclave?',
    answer:
      'The gateway serves GET /attestation, an AWS-signed document naming the exact enclave image that holds their key. Anyone can fetch it with a nonce and check the measurement against the published build, so users do not have to trust you or us.'
  },
  {
    question: 'What does it cost?',
    answer:
      'Self-hosting is free and open source: you pay AWS for one small Graviton instance with enclaves and a KMS key, roughly fifty dollars a month. The managed service, where we run the enclave and the dashboard, is coming soon; join the waitlist to hear first.'
  }
];
