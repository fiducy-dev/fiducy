import { createFiducy } from '@fiducy/sdk/server';
import { fileStorage, readSessionUser } from './example-kit/index.ts';

export const fiducyServer = createFiducy({
  storage: fileStorage(),
  getUserID: readSessionUser
});
