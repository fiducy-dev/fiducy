import type { ContextHandler, FiducyRequestHandler } from './types.ts';

export function toTanStackHandlers(fiducy: FiducyRequestHandler) {
  const handle: ContextHandler = ({ request }) => fiducy.handler(request);
  return { GET: handle, POST: handle, DELETE: handle };
}
