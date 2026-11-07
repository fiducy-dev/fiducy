import { createFiducy } from '@fiducy/sdk/server';
import { fileStorage, readSessionUser } from './example-kit';

export const fiducy = createFiducy({
  storage: fileStorage(),
  getUserID: readSessionUser
});
