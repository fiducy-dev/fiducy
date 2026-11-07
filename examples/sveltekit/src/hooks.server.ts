import { svelteKitHandler } from '@fiducy/sdk/sveltekit';

import { fiducy } from '#lib/server/fiducy';

import type { Handle } from '@sveltejs/kit';

export const handle: Handle = ({ event, resolve }) => svelteKitHandler({ event, resolve, fiducy });
