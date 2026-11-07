import { MAX_REQUEST_BODY_BYTES } from '../constants.ts';
import { FiducyInputError } from './errors.ts';

export function respondWith(status: number, data: unknown, message: string): Response {
  return Response.json({ data, message }, { status, headers: { 'cache-control': 'no-store' } });
}

export function isCrossSite(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (origin === null) return false;
  const host = request.headers.get('host') ?? new URL(request.url).host;
  return URL.parse(origin)?.host !== host;
}

function isJSONRequest(request: Request): boolean {
  return request.headers.get('content-type')?.split(';')[0]?.trim() === 'application/json';
}

async function readLimitedText(request: Request): Promise<string> {
  const declaredLength = Number(request.headers.get('content-length') ?? 0);
  if (declaredLength > MAX_REQUEST_BODY_BYTES) throw new FiducyInputError('The body is too large');
  const reader = request.body?.getReader();
  if (!reader) return '';
  const chunks: Uint8Array[] = [];
  let receivedBytes = 0;
  for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
    receivedBytes += chunk.value.byteLength;
    if (receivedBytes > MAX_REQUEST_BODY_BYTES) {
      await reader.cancel();
      throw new FiducyInputError('The body is too large');
    }
    chunks.push(chunk.value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

export async function readJSONBody(request: Request): Promise<unknown> {
  if (!isJSONRequest(request)) throw new FiducyInputError('Send the body as application/json');
  const text = await readLimitedText(request);
  try {
    return JSON.parse(text);
  } catch {
    throw new FiducyInputError('Send a JSON body');
  }
}
