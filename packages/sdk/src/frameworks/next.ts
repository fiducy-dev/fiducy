import type { FiducyRequestHandler } from './types.ts';

export function toNextJsHandler(fiducy: FiducyRequestHandler) {
  const handle = (request: Request) => fiducy.handler(request);
  return { GET: handle, POST: handle, DELETE: handle };
}
