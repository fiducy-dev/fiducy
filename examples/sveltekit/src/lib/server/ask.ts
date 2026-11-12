import { createOpenAI } from '@ai-sdk/openai';
import { respondToMissingKey } from '@fiducy/sdk/server';
import { generateText } from 'ai';

import { fiducy } from '#lib/server/fiducy';

export async function answerQuestion(request: Request): Promise<Response> {
  const { question } = (await request.json()) as { question: string };
  const settings = await fiducy.providerSettings('openai', { request });
  if (!settings.ok) return respondToMissingKey(settings);
  try {
    const { text } = await generateText({
      model: createOpenAI(settings).responses('gpt-4o-mini'),
      prompt: question,
      maxRetries: 0
    });
    return Response.json({ data: { answer: text }, message: 'Answered' });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ data: null, message }, { status: 502 });
  }
}
