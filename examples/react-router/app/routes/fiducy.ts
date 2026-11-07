import { toReactRouterHandlers } from '@fiducy/sdk/react-router';

import { fiducy } from '@/lib/fiducy';

const handlers = toReactRouterHandlers(fiducy);

export const loader = handlers.loader;
export const action = handlers.action;
