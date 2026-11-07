import type { IncomingMessage, ServerResponse } from 'node:http';
import type { FiducyRequestHandler, NodeRequest } from './types.ts';

const BODYLESS_METHODS = ['GET', 'HEAD'];

function copyHeaders(request: IncomingMessage): Headers {
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (Array.isArray(value)) for (const item of value) headers.append(name, item);
    else if (value !== undefined) headers.set(name, value);
  }
  return headers;
}

function streamBody(request: NodeRequest): ReadableStream<Uint8Array> {
  const chunks = request[Symbol.asyncIterator]();
  return new ReadableStream<Uint8Array>({
    pull: async (controller) => {
      const chunk = await chunks.next();
      if (chunk.done) controller.close();
      else controller.enqueue(new Uint8Array(chunk.value));
    },
    cancel: () => {
      request.destroy();
    }
  });
}

function readParsedBody(body: unknown): string {
  if (typeof body === 'string') return body;
  if (body instanceof Uint8Array) return new TextDecoder().decode(body);
  return JSON.stringify(body);
}

export function toWebRequest(request: NodeRequest, parsedBody?: unknown): Request {
  const isEncrypted = 'encrypted' in request.socket && request.socket.encrypted === true;
  const origin = `${isEncrypted ? 'https' : 'http'}://${request.headers.host ?? 'localhost'}`;
  const url = new URL(request.originalUrl ?? request.url ?? '/', origin);
  const method = request.method ?? 'GET';
  const headers = copyHeaders(request);
  if (BODYLESS_METHODS.includes(method)) return new Request(url, { method, headers });
  const body = parsedBody ?? request.body;
  if (body !== undefined) {
    headers.delete('content-length');
    return new Request(url, { method, headers, body: readParsedBody(body) });
  }
  const init: RequestInit & { duplex: 'half' } = {
    method,
    headers,
    body: streamBody(request),
    duplex: 'half'
  };
  return new Request(url, init);
}

function copyResponseHeaders(response: Response, target: ServerResponse) {
  response.headers.forEach((value, name) => {
    if (name !== 'set-cookie') target.setHeader(name, value);
  });
  const cookies = response.headers.getSetCookie();
  if (cookies.length > 0) target.setHeader('set-cookie', cookies);
}

function writeChunk(target: ServerResponse, chunk: Uint8Array) {
  return new Promise<void>((resolve) => {
    if (target.write(chunk)) resolve();
    else target.once('drain', resolve);
  });
}

export async function sendWebResponse(response: Response, target: ServerResponse): Promise<void> {
  target.statusCode = response.status;
  copyResponseHeaders(response, target);
  if (!response.body) {
    target.end();
    return;
  }
  const reader = response.body.getReader();
  target.once('close', () => {
    reader.cancel().catch(() => undefined);
  });
  for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
    if (target.destroyed) return;
    await writeChunk(target, chunk.value);
  }
  target.end();
}

export function toNodeHandler(fiducy: FiducyRequestHandler) {
  return async (request: NodeRequest, response: ServerResponse): Promise<void> => {
    await sendWebResponse(await fiducy.handler(toWebRequest(request)), response);
  };
}
