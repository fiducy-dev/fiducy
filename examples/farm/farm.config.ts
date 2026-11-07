import { defineConfig } from '@farm.js/core';
import { fiducy } from '@fiducy/farm';

import { fiducyServer } from './src/lib/fiducy';

export default defineConfig({
  integrations: {
    byok: fiducy({ instance: fiducyServer })
  }
});
