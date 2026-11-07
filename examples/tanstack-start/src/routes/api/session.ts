import { signInTestUser } from '@/lib/example-kit';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/session')({
  server: { handlers: { POST: signInTestUser } }
});
