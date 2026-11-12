import { afterEach, describe, expect, it } from 'bun:test';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { readMasterKey } from '../src/masterKey';

const ENCODED_KEY = Buffer.alloc(32, 7).toString('base64url');
const originalMasterKey = process.env.FIDUCY_MASTER_KEY;

afterEach(() => {
  if (originalMasterKey === undefined) Reflect.deleteProperty(process.env, 'FIDUCY_MASTER_KEY');
  else process.env.FIDUCY_MASTER_KEY = originalMasterKey;
});

describe('readMasterKey', () => {
  it('reads the key outside an enclave', () => {
    process.env.FIDUCY_MASTER_KEY = ENCODED_KEY;
    const key = readMasterKey(join(tmpdir(), 'no-nsm-device-here'));
    expect(key.length).toBe(32);
  });

  it('refuses inside an enclave, even when the key is set', () => {
    process.env.FIDUCY_MASTER_KEY = ENCODED_KEY;
    const devicePath = join(mkdtempSync(join(tmpdir(), 'nsm-')), 'nsm');
    writeFileSync(devicePath, '');
    expect(() => readMasterKey(devicePath)).toThrow('local development only');
  });
});
