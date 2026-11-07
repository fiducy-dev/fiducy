import { fileStorage, readSessionUser } from '@/lib/example-kit';
import { createFiducy } from '@fiducy/sdk/server';

export const fiducy = createFiducy({
  storage: fileStorage(),
  getUserID: readSessionUser
});
