import { DEFAULT_BASE_PATH } from '../constants.ts';

import type { SvelteKitEventLike, SvelteKitHandleInput } from './types.ts';

function isUnderBasePath(pathname: string, basePath: string): boolean {
  return pathname === basePath || pathname.startsWith(`${basePath}/`);
}

export function svelteKitHandler<Event extends SvelteKitEventLike>({
  event,
  resolve,
  fiducy
}: SvelteKitHandleInput<Event>): Response | Promise<Response> {
  const basePath = fiducy.basePath ?? DEFAULT_BASE_PATH;
  if (!isUnderBasePath(event.url.pathname, basePath)) return resolve(event);
  return fiducy.handler(event.request);
}
