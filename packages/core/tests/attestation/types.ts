import type { CBORValue } from '../../src/attestation/types.ts';
import type { Bytes } from '../../src/types.ts';

export interface TestDocumentOptions {
  timestamp?: number;
  pcr0?: string;
  pcrs?: Map<number, Bytes>;
  nonce?: Bytes | null;
  leafCertificate?: string;
  privateKey?: string;
  bundle?: string[];
  algorithm?: number;
  payload?: Map<string, CBORValue>;
}
