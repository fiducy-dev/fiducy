import { defineConfig } from '@farm.js/core';
import { fiducy } from '@fiducy/farm';
import { z } from 'zod';

import { FIDUCY_STORAGE_MOUNT } from './src/lib/constants';
import { fiducyServer } from './src/lib/fiducy';
import { createDemoStorageClient } from './src/lib/storage';

export default defineConfig({
  deploy: { target: 'vercel' },
  env: {
    server: {
      FIDUCY_APP_ID: z.string().min(1),
      FIDUCY_GATEWAY_URL: z.string().url(),
      FIDUCY_APP_SECRET: z.string().min(1)
    }
  },
  storage: {
    mounts: { [FIDUCY_STORAGE_MOUNT]: createDemoStorageClient() }
  },
  integrations: {
    byok: fiducy({ instance: fiducyServer })
  }
});
