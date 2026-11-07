import { FiducyKey } from '@fiducy/sdk/react';

import { AskForm } from '@/components/AskForm';

export const HomePage = () => (
  <main>
    <h1>Fiducy with TanStack Start</h1>
    <form method="post" action="/api/session">
      <button type="submit">Sign in as a test user</button>
    </form>
    <FiducyKey provider="openai" />
    <AskForm />
  </main>
);
