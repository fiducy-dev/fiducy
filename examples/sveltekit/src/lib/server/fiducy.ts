import * as env from '$app/env/private';
import { createFiducy } from '@fiducy/sdk/server';
import { fileStorage, readSessionUser, useExampleEnvironment } from '#lib/example-kit/index';

useExampleEnvironment(env);

export const fiducy = createFiducy({
  env,
  storage: fileStorage(),
  getUserID: readSessionUser
});
