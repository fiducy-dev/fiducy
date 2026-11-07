import { toNextJsHandler } from '@fiducy/sdk/next';

import { fiducy } from '@/lib/fiducy';

export const { GET, POST, DELETE } = toNextJsHandler(fiducy);
