import { describe, expect, it } from 'bun:test';

import { APICallError, simulateReadableStream, streamText } from 'ai';
import { MockLanguageModelV4 } from 'ai/test';

import {
  CONNECT_KEY_TOOL,
  requestKey,
  streamWithKeyRequests,
  withoutKeyRequests
} from '../src/server';

import type { UIMessage } from 'ai';

function keyRequestMessage(toolCallId: string): UIMessage {
  return {
    id: 'a1',
    role: 'assistant',
    parts: [
      { type: 'text', text: 'Connect your OpenAI key to keep going.' },
      {
        type: `tool-${CONNECT_KEY_TOOL}`,
        toolCallId,
        state: 'output-available',
        input: { provider: 'openai' },
        output: { connected: true, provider: 'openai' }
      }
    ]
  } as UIMessage;
}

const question: UIMessage = { id: 'u1', role: 'user', parts: [{ type: 'text', text: 'Hi' }] };

describe('requestKey', () => {
  it('streams a message that calls the connect tool for the provider', async () => {
    const response = requestKey({ provider: 'gemini' });
    const body = await response.text();
    expect(response.headers.get('content-type')).toContain('text/event-stream');
    expect(body).toContain('Connect your Gemini key to keep going.');
    expect(body).toContain('"type":"tool-input-available"');
    expect(body).toContain(`"toolName":"${CONNECT_KEY_TOOL}"`);
    expect(body).toContain('"input":{"provider":"gemini"}');
    expect(body).toMatch(/"toolCallId":"fiducy_[0-9a-f-]{36}"/);
  });
});

describe('withoutKeyRequests', () => {
  it('drops the key requests the server made so the question is last', () => {
    expect(withoutKeyRequests([question, keyRequestMessage('fiducy_1')])).toEqual([question]);
  });

  it('keeps key requests the model made itself', () => {
    const fromModel = keyRequestMessage('call_abc');
    expect(withoutKeyRequests([question, fromModel])).toEqual([question, fromModel]);
  });
});

function failingModel(headers: Record<string, string>, message: string) {
  return new MockLanguageModelV4({
    doStream: async () => {
      throw new APICallError({
        message,
        url: 'http://localhost:3438/openai/v1/responses',
        requestBodyValues: {},
        statusCode: 404,
        responseHeaders: headers,
        isRetryable: false
      });
    }
  });
}

describe('streamWithKeyRequests', () => {
  it('asks for the key in the thread when the saved key is gone', async () => {
    const lost = 'The saved OpenAI key is no longer available. Connect it again.';
    const model = failingModel({ 'x-fiducy-error': 'key-unavailable' }, lost);
    const result = streamText({ model, prompt: 'Hi', maxRetries: 0 });
    const body = await streamWithKeyRequests({ provider: 'openai', stream: result.stream }).text();
    expect(body).toContain(lost);
    expect(body).toContain(`"toolName":"${CONNECT_KEY_TOOL}"`);
    expect(body).toMatch(/"toolCallId":"fiducy_/);
    expect(body).not.toContain('"type":"error"');
  });

  it('passes other errors and normal answers through', async () => {
    const failing = streamText({
      model: failingModel({}, 'Rate limited'),
      prompt: 'Hi',
      maxRetries: 0
    });
    const failed = await streamWithKeyRequests({
      provider: 'openai',
      stream: failing.stream
    }).text();
    expect(failed).toContain('"type":"error","errorText":"Rate limited"');
    expect(failed).not.toContain(CONNECT_KEY_TOOL);

    const model = new MockLanguageModelV4({
      doStream: async () => ({
        stream: simulateReadableStream({
          chunks: [
            { type: 'text-start', id: 't' },
            { type: 'text-delta', id: 't', delta: 'Hello' },
            { type: 'text-end', id: 't' },
            {
              type: 'finish',
              finishReason: { unified: 'stop', raw: 'stop' },
              usage: {
                inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
                outputTokens: { total: 1, text: 1, reasoning: 0 }
              }
            }
          ]
        })
      })
    });
    const answered = streamText({ model, prompt: 'Hi' });
    const body = await streamWithKeyRequests({
      provider: 'openai',
      stream: answered.stream
    }).text();
    expect(body).toContain('"delta":"Hello"');
    expect(body.indexOf('"type":"start"')).toBeLessThan(body.indexOf('"delta":"Hello"'));
  });
});
