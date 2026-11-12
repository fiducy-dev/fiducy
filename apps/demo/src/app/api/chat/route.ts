import { frontendTools } from '@assistant-ui/react-ai-sdk';
import { requestKey, streamWithKeyRequests, withoutKeyRequests } from '@fiducy/assistant-ui/server';
import { convertToModelMessages, streamText } from 'ai';

import { describeChatError } from '@/lib/chatErrors';
import { fiducyServer, readDemoUser } from '@/lib/fiducy';
import { createLanguageModel, findDemoModel } from '@/lib/models';
import { respondWith } from '@/lib/responses';
import { chatRequestSchema } from '@/lib/validators';

import type { ChatRequestBody } from '@/lib/types';

export async function POST(request: Request) {
  const parsed = chatRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return respondWith(400, null, parsed.error.issues[0]?.message ?? 'Invalid chat request');
  }
  const body = parsed.data as ChatRequestBody;
  const userID = readDemoUser(request);
  if (!userID) return respondWith(401, null, 'Reload the page to start a demo session');

  const model = findDemoModel(body.model);
  const settings = await fiducyServer.providerSettings(model.provider, { userID });
  // No key yet: the reply asks for one, and the key box opens inside the thread.
  if (!settings.ok) return requestKey({ provider: model.provider });

  const tools = frontendTools(body.tools ?? {});
  const result = streamText({
    model: createLanguageModel(model, settings),
    system: 'You are Acme Chat, a concise assistant.',
    messages: await convertToModelMessages(withoutKeyRequests(body.messages), { tools }),
    tools,
    maxRetries: 0
  });
  return streamWithKeyRequests({
    provider: model.provider,
    stream: result.stream,
    tools,
    onError: describeChatError
  });
}
