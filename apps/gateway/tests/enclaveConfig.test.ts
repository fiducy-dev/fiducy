import { describe, expect, it } from 'bun:test';

import { GetParameterCommand } from '@aws-sdk/client-ssm';

import { encodeCbor } from '../src/cbor';
import { fetchEnclaveConfig, measureEnclaveConfig, parseEnclaveConfig } from '../src/enclaveConfig';

import type { ParameterSender } from '../src/types';

const CONFIG = {
  controlPlaneURL: 'https://dashboard.example.com',
  gatewayTokenCiphertext: 'AQICAHh...',
  keysTable: 'fiducy-keys',
  kmsKeyID: 'arn:aws:kms:us-east-1:111122223333:key/test',
  publicHost: 'gateway.example.com',
  region: 'us-east-1'
};

function toHex(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('hex');
}

describe('enclave config', () => {
  it('accepts a complete config', () => {
    expect(parseEnclaveConfig(JSON.stringify(CONFIG))).toEqual(CONFIG);
  });

  it('refuses missing, empty and unknown fields', () => {
    const { region: _region, ...missing } = CONFIG;
    expect(() => parseEnclaveConfig(JSON.stringify(missing))).toThrow('needs region');
    expect(() => parseEnclaveConfig(JSON.stringify({ ...CONFIG, keysTable: '' }))).toThrow(
      'needs keysTable'
    );
    expect(() => parseEnclaveConfig(JSON.stringify({ ...CONFIG, extra: 'x' }))).toThrow(
      'unknown field extra'
    );
    expect(() => parseEnclaveConfig('[]')).toThrow('JSON object');
  });

  it('measures PCR16 the way host.sh computes it with openssl', () => {
    const { expectedPCR } = measureEnclaveConfig('{"a":"b"}');
    expect(toHex(expectedPCR)).toBe(
      '32b7b2476091838990400adadf9d5488b5f42f5890dea0454fe122702ba333eb6c3fb317400334f23af356740984191f'
    );
  });

  it('reads the config from Parameter Store', async () => {
    const client: ParameterSender = {
      send: async (command) => {
        expect(command).toBeInstanceOf(GetParameterCommand);
        expect(command.input.Name).toBe('/fiducy/enclave-config');
        return { Parameter: { Value: '{"a":"b"}' }, $metadata: {} };
      }
    };
    expect(await fetchEnclaveConfig(client, '/fiducy/enclave-config')).toBe('{"a":"b"}');
  });
});

describe('secure module requests', () => {
  it('encode like the NSM driver expects', () => {
    expect(toHex(encodeCbor({ LockPCR: { index: 16 } }))).toBe(
      'a1674c6f636b504352a165696e64657810'
    );
    expect(toHex(encodeCbor('LockPCR'))).toBe('674c6f636b504352');
    const data = new Uint8Array(48).fill(1);
    const encoded = encodeCbor({ ExtendPCR: { index: 16, data } });
    expect(toHex(encoded.slice(0, 26))).toBe(
      'a169457874656e64504352a265696e6465781064646174615830'
    );
    expect(encoded.slice(26)).toEqual(data);
  });
});
