import { defineEnvVars } from '@sveltejs/kit/env';

const readOptional = (value: string | undefined) => value;

export const variables = defineEnvVars({
  FIDUCY_GATEWAY_URL: {},
  FIDUCY_APP_ID: {},
  FIDUCY_APP_SECRET: {},
  FIDUCY_ENCLAVE_PCR0: { schema: readOptional },
  FIDUCY_ENCLAVE_PCR16: { schema: readOptional },
  FIDUCY_SKIP_ATTESTATION: { schema: readOptional },
  EXAMPLE_SESSION_SECRET: { schema: readOptional },
  EXAMPLE_DATA_DIR: { schema: readOptional }
});
