import { existsSync } from 'node:fs';

import { NSM_DEVICE_PATH } from './constants';

import type { Bytes } from '@fiducy/core';

// The master key wraps share B with a plain env var instead of KMS, so whoever reads the env can
// open every share. It is for running the gateway on a laptop. Inside a Nitro enclave it is
// refused, so a deployment can never fall back to it, by mistake or on purpose.
export function readMasterKey(nsmDevicePath: string = NSM_DEVICE_PATH): Bytes {
  if (existsSync(nsmDevicePath)) {
    throw new Error(
      'FIDUCY_MASTER_KEY is for local development only. In an enclave set FIDUCY_KMS_KEY_ID'
    );
  }
  const encodedMasterKey = process.env.FIDUCY_MASTER_KEY;
  if (!encodedMasterKey) throw new Error('Set FIDUCY_MASTER_KEY to 32 random bytes in base64url');
  return new Uint8Array(Buffer.from(encodedMasterKey, 'base64url'));
}
