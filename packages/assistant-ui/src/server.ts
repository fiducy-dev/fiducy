import { createUIMessageStream, createUIMessageStreamResponse } from 'ai';

import { CONNECT_KEY_TOOL, PROVIDER_LABELS, SERVER_TOOL_CALL_PREFIX } from './constants.ts';
import { writeKeyRequest } from './keyRequestStream.ts';

import type { UIMessage } from 'ai';
import type { KeyRequestOptions } from './types.ts';

function isServerKeyRequest(part: UIMessage['parts'][number]): boolean {
  const isConnectTool =
    part.type === `tool-${CONNECT_KEY_TOOL}` ||
    (part.type === 'dynamic-tool' && part.toolName === CONNECT_KEY_TOOL);
  return (
    isConnectTool && 'toolCallId' in part && part.toolCallId.startsWith(SERVER_TOOL_CALL_PREFIX)
  );
}

/**
 * Answers a chat request for a user with no key: instead of an error, the assistant message
 * asks for the key and calls the `connect_api_key` tool, so the key box shows in the thread.
 * Once the user saves a key, assistant-ui sends the conversation again and the model answers.
 */
export function requestKey({ provider, message }: KeyRequestOptions): Response {
  const text = message ?? `Connect your ${PROVIDER_LABELS[provider]} key to keep going.`;
  const stream = createUIMessageStream({
    execute: ({ writer }) => writeKeyRequest(writer, provider, text)
  });
  return createUIMessageStreamResponse({ stream });
}

/**
 * Drops the assistant turns that `requestKey` wrote, so the model sees the user's question
 * as the last message and answers it. Key requests the model made itself are kept.
 */
export function withoutKeyRequests<T extends UIMessage>(messages: T[]): T[] {
  return messages.filter(
    (message) => message.role !== 'assistant' || !message.parts.some(isServerKeyRequest)
  );
}

export { CONNECT_KEY_TOOL } from './constants.ts';
export { streamWithKeyRequests } from './keyRequestStream.ts';
export type { ConnectKeyArgs, ConnectKeyResult, KeyRequestOptions } from './types.ts';
export type { KeyRequestStreamOptions } from './types.ts';
