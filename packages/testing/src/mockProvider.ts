import { SAMPLE_API_KEY } from './fixtures';

import type { RecordedRequest } from './types';

const encoder = new TextEncoder();

export const OPENAI_STREAM_CHUNKS = [
  'data: {"id":"chatcmpl-1","choices":[{"index":0,"delta":{"role":"assistant","content":"Here is"}}]}\n\n',
  'data: {"id":"chatcmpl-1","choices":[{"index":0,"delta":{"content":" a summ',
  'ary."}}]}\n\ndata: {"id":"chatcmpl-1","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}\n\n',
  'data: {"id":"chatcmpl-1","choices":[],"usage":{"prompt_tokens":41,"completion_tokens":17}}\n\n',
  'data: [DONE]\n\n'
];

export const ANTHROPIC_STREAM_CHUNKS = [
  'event: message_start\ndata: {"type":"message_start","message":{"id":"msg_01","type":"message","role":"assistant","model":"claude-sonnet-4-5","content":[],"stop_reason":null,"stop_sequence":null,"usage":{"input_tokens":25,"output_tokens":1}}}\n\n',
  'event: content_block_start\ndata: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}\n\n',
  'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hi there"}}\n\n',
  'event: content_block_stop\ndata: {"type":"content_block_stop","index":0}\n\n',
  'event: message_delta\ndata: {"type":"message_delta","delta":{"stop_reason":"end_turn","stop_sequence":null},"usage":{"output_tokens":12}}\n\n',
  'event: message_stop\ndata: {"type":"message_stop"}\n\n'
];

export const OPENAI_RESPONSES_STREAM_CHUNKS = [
  'event: response.created\ndata: {"type":"response.created","sequence_number":0,"response":{"id":"resp_1","object":"response","created_at":1767225600,"model":"gpt-4o-mini","status":"in_progress","output":[],"usage":null}}\n\n',
  'event: response.output_item.added\ndata: {"type":"response.output_item.added","sequence_number":1,"output_index":0,"item":{"type":"message","id":"msg_1","status":"in_progress","role":"assistant","content":[]}}\n\n',
  'event: response.output_text.delta\ndata: {"type":"response.output_text.delta","sequence_number":2,"item_id":"msg_1","output_index":0,"content_index":0,"delta":"Here is","logprobs":[]}\n\n',
  'event: response.output_text.delta\ndata: {"type":"response.output_text.delta","sequence_number":3,"item_id":"msg_1","output_index":0,"content_index":0,"delta":" a summary.","logprobs":[]}\n\n',
  'event: response.output_item.done\ndata: {"type":"response.output_item.done","sequence_number":4,"output_index":0,"item":{"type":"message","id":"msg_1","status":"completed","role":"assistant","content":[{"type":"output_text","text":"Here is a summary.","annotations":[]}]}}\n\n',
  'event: response.completed\ndata: {"type":"response.completed","sequence_number":5,"response":{"id":"resp_1","object":"response","created_at":1767225600,"model":"gpt-4o-mini","status":"completed","incomplete_details":null,"usage":{"input_tokens":36,"output_tokens":14,"input_tokens_details":{"cached_tokens":0},"output_tokens_details":{"reasoning_tokens":0}}}}\n\n'
];

function streamChunks(chunks: string[]): Response {
  const body = new ReadableStream({
    start: (controller) => {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    }
  });
  return new Response(body, { headers: { 'content-type': 'text/event-stream' } });
}

function answerChatCompletion(body: string): Response {
  if (JSON.parse(body).stream) return streamChunks(OPENAI_STREAM_CHUNKS);
  return Response.json(
    {
      id: 'chatcmpl-0',
      choices: [
        { index: 0, message: { role: 'assistant', content: 'Hello' }, finish_reason: 'stop' }
      ],
      usage: { prompt_tokens: 9, completion_tokens: 3 }
    },
    { headers: { 'set-cookie': 'tracking=1' } }
  );
}

function answerResponse(body: string): Response {
  if (JSON.parse(body).stream) return streamChunks(OPENAI_RESPONSES_STREAM_CHUNKS);
  return Response.json({
    id: 'resp_0',
    object: 'response',
    created_at: 1767225600,
    model: 'gpt-4o-mini',
    status: 'completed',
    incomplete_details: null,
    output: [
      {
        type: 'message',
        id: 'msg_0',
        status: 'completed',
        role: 'assistant',
        content: [{ type: 'output_text', text: 'Hello', annotations: [] }]
      }
    ],
    usage: { input_tokens: 9, output_tokens: 3 }
  });
}

export const GEMINI_STREAM_CHUNKS = [
  'data: {"candidates":[{"content":{"role":"model","parts":[{"text":"Hi from"}]},"index":0}]}\r\n\r\n',
  'data: {"candidates":[{"content":{"role":"model","parts":[{"text":" Gemini"}]},"finishReason":"STOP","index":0}],"usageMetadata":{"promptTokenCount":3,"candidatesTokenCount":4,"totalTokenCount":7}}\r\n\r\n'
];

function answerGemini(path: string): Response {
  if (path.endsWith(':streamGenerateContent')) return streamChunks(GEMINI_STREAM_CHUNKS);
  return Response.json({
    candidates: [
      {
        content: { role: 'model', parts: [{ text: 'Hello' }] },
        finishReason: 'STOP',
        index: 0
      }
    ],
    usageMetadata: { promptTokenCount: 3, candidatesTokenCount: 1, totalTokenCount: 4 }
  });
}

function answerInvalidKey(): Response {
  const message = `Incorrect API key provided: sk-proj-a81f****9c2e. Received ${SAMPLE_API_KEY}`;
  return Response.json({ error: { message } }, { status: 401 });
}

export function answerMockProviderRequest(path: string, body: string): Response {
  if (path.endsWith('/v1/chat/completions')) return answerChatCompletion(body);
  if (path.endsWith('/v1/responses')) return answerResponse(body);
  if (path.endsWith('/v1/messages')) return streamChunks(ANTHROPIC_STREAM_CHUNKS);
  if (/^\/v1beta\/models\/[^/]+:(stream)?[gG]enerateContent$/.test(path)) return answerGemini(path);
  if (path.endsWith('/v1/invalid-key')) return answerInvalidKey();
  return new Response('not found', { status: 404 });
}

export function startMockProvider() {
  const recordedRequests: RecordedRequest[] = [];
  const server = Bun.serve({
    port: 0,
    fetch: async (request) => {
      const path = new URL(request.url).pathname;
      const body = await request.text();
      recordedRequests.push({ path, headers: request.headers, body });
      return answerMockProviderRequest(path, body);
    }
  });
  return { server, recordedRequests, baseURL: `http://localhost:${server.port}` };
}
