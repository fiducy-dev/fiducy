import { createFileRoute } from '@tanstack/react-router';

import { answerQuestion } from '@/lib/ask';

export const Route = createFileRoute('/api/ask')({
  server: { handlers: { POST: ({ request }) => answerQuestion(request) } }
});
