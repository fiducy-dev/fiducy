import { toWebRequest } from './node.ts';

import type { FiducyRequestHandler, NuxtEventLike } from './types.ts';

function readWebRequest(event: NuxtEventLike): Request {
  if (event.req instanceof Request) return event.req;
  return toWebRequest(event.node.req);
}

export function toNuxtHandler(fiducy: FiducyRequestHandler) {
  return (event: NuxtEventLike) => fiducy.handler(readWebRequest(event));
}
