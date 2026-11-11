export interface CodeSampleTab {
  id: string;
  label: string;
  file: string;
  code: string;
}

export const CODE_SAMPLES: CodeSampleTab[] = [
  {
    id: 'server',
    label: 'Server',
    file: 'lib/fiducy.ts',
    code: `import { createFiducy } from '@fiducy/sdk/server';
import { kyselyStorage } from '@fiducy/sdk/storage/kysely';

import { auth } from '@/lib/auth'; // your auth (Better Auth shown)
import { pool } from '@/lib/db'; // your database

// Written by npx fiducy init. Reads FIDUCY_* from server env.
export const fiducy = createFiducy({
  storage: kyselyStorage(pool),
  getUserID: async (request) => {
    const session = await auth.api.getSession({ headers: request.headers });
    return session?.user.id ?? null;
  }
});`
  },
  {
    id: 'routes',
    label: 'Key route',
    file: 'app/api/fiducy/[...path]/route.ts',
    code: `import { toNextJsHandler } from '@fiducy/sdk/next';

import { fiducy } from '@/lib/fiducy';

export const { GET, POST, DELETE } = toNextJsHandler(fiducy);`
  },
  {
    id: 'widget',
    label: 'Widget',
    file: 'components/KeySettings.tsx',
    code: `'use client';

import { FiducyKey } from '@fiducy/sdk/react';

// Reads the gateway URL and app ID from your key route.
export const KeySettings = () => <FiducyKey provider="openai" />;`
  },
  {
    id: 'route',
    label: 'Model call',
    file: 'app/api/chat/route.ts',
    code: `import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';

import { respondToMissingKey } from '@fiducy/sdk/server';

import { fiducy } from '@/lib/fiducy';

export async function POST(request: Request) {
  const settings = await fiducy.providerSettings('openai', { request });
  if (!settings.ok) return respondToMissingKey(settings);

  const { messages } = await request.json();
  const result = streamText({ model: createOpenAI(settings).responses('gpt-4o-mini'), messages });
  return result.toUIMessageStreamResponse();
}`
  }
];
