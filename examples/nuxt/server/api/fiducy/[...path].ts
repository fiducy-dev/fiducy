import { toNuxtHandler } from '@fiducy/sdk/nuxt';

import { fiducy } from '../../utils/fiducy';

export default defineEventHandler(toNuxtHandler(fiducy));
