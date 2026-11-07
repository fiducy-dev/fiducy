import { defineEnvVars } from '@sveltejs/kit/env';

const readOptional = (value: string | undefined) => value;

export const variables = defineEnvVars({
  FIDUCY_GATEWAY_URL: {},
  FIDUCY_APP_ID: {},
  FIDUCY_APP_SECRET: {},
  EXAMPLE_SESSION_SECRET: {},
  EXAMPLE_DATA_DIR: { schema: readOptional }
});
