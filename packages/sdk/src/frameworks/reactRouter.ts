import type { ContextHandler, FiducyRequestHandler } from './types.ts';

export function toReactRouterHandlers(fiducy: FiducyRequestHandler) {
  const handle: ContextHandler = ({ request }) => fiducy.handler(request);
  return { loader: handle, action: handle };
}
