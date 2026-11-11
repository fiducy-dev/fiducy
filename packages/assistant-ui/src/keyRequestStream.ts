import { APICallError, createUIMessageStream, createUIMessageStreamResponse } from 'ai';
import { toUIMessageStream } from 'ai';

import { CONNECT_KEY_TOOL, GATEWAY_ERROR_HEADER, KEY_UNAVAILABLE_ERROR } from './constants.ts';
import { SERVER_TOOL_CALL_PREFIX } from './constants.ts';

import type { GatewayProvider } from '@fiducy/sdk';
import type { ToolSet, UIMessageChunk, UIMessageStreamWriter } from 'ai';
import type { KeyRequestStreamOptions } from './types.ts';

const OPENING_CHUNKS = new Set(['start', 'start-step']);

export function writeKeyRequest(
  writer: UIMessageStreamWriter,
  provider: GatewayProvider,
  text: string
) {
  writer.write({ type: 'start' });
  writer.write({ type: 'start-step' });
  writer.write({ type: 'text-start', id: 'fiducy-key-request' });
  writer.write({ type: 'text-delta', id: 'fiducy-key-request', delta: text });
  writer.write({ type: 'text-end', id: 'fiducy-key-request' });
  writer.write({
    type: 'tool-input-available',
    toolCallId: `${SERVER_TOOL_CALL_PREFIX}${crypto.randomUUID()}`,
    toolName: CONNECT_KEY_TOOL,
    input: { provider }
  });
  writer.write({ type: 'finish-step' });
  writer.write({ type: 'finish' });
}

function isKeyUnavailable(error: unknown): boolean {
  if (!APICallError.isInstance(error)) return false;
  return error.responseHeaders?.[GATEWAY_ERROR_HEADER] === KEY_UNAVAILABLE_ERROR;
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Streams a chat answer like `createUIMessageStreamResponse`, but when the user's saved key is
 * gone (for example after the gateway was reset), the thread asks for the key with the key box
 * instead of showing an error. Fiducy has already dropped the dead handle by then.
 */
export function streamWithKeyRequests<TOOLS extends ToolSet>({
  provider,
  stream,
  tools,
  onError = describeError
}: KeyRequestStreamOptions<TOOLS>): Response {
  let lostKeyMessage: string | null = null;
  const handleError = (error: unknown) => {
    if (isKeyUnavailable(error)) lostKeyMessage = describeError(error);
    return onError(error);
  };
  const source = toUIMessageStream({ stream, tools, onError: handleError });
  const output = createUIMessageStream({
    execute: async ({ writer }) => {
      const opening: UIMessageChunk[] = [];
      let answering = false;
      for await (const chunk of source as AsyncIterable<UIMessageChunk>) {
        if (!answering && chunk.type === 'error' && lostKeyMessage !== null) {
          writeKeyRequest(writer, provider, lostKeyMessage);
          return;
        }
        if (!answering && OPENING_CHUNKS.has(chunk.type)) {
          opening.push(chunk);
          continue;
        }
        if (!answering) for (const held of opening) writer.write(held);
        answering = true;
        writer.write(chunk);
      }
      if (!answering) for (const held of opening) writer.write(held);
    }
  });
  return createUIMessageStreamResponse({ stream: output });
}
