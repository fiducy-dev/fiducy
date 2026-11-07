import { answerQuestion } from '@/lib/ask';

import type { Route } from './+types/ask';

export const action = ({ request }: Route.ActionArgs) => answerQuestion(request);
