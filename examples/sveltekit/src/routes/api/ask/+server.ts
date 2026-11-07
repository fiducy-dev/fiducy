import { answerQuestion } from '#lib/server/ask';

import type { RequestHandler } from './$types';

export const POST: RequestHandler = ({ request }) => answerQuestion(request);
