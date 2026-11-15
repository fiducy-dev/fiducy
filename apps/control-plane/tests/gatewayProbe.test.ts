import { describe, expect, it } from 'bun:test';

import { MISSING_ENCLAVE_PCRS } from '../src/lib/constants';
import { createGatewayProbe } from '../src/lib/gatewayProbe';

import type { GatewayProbeOptions } from '../src/lib/types';

const PCR = 'ab'.repeat(48);

function respondWith(routes: Record<string, () => Response>): GatewayProbeOptions['fetch'] {
  return async (url) => {
    const route = routes[new URL(url).pathname];
    if (!route) throw new Error(`connect ECONNREFUSED ${url}`);
    return route();
  };
}

function probeWith(overrides: Partial<GatewayProbeOptions>) {
  return createGatewayProbe({
    gatewayURL: 'https://gw.example',
    enclavePCR0: PCR,
    enclavePCR16: PCR,
    fetch: respondWith({}),
    ...overrides
  })();
}

const healthy = { '/health': () => Response.json({ data: { status: 'ok' } }) };

describe('checking the gateway from the dashboard', () => {
  it('is online when /health answers and unreachable when it does not', async () => {
    expect((await probeWith({ fetch: respondWith(healthy) })).healthy).toBe(true);
    expect((await probeWith({})).healthy).toBe(false);
    const failing = { '/health': () => new Response(null, { status: 502 }) };
    expect((await probeWith({ fetch: respondWith(failing) })).healthy).toBe(false);
  });

  it('does not count the enclave as verified when there is no attestation', async () => {
    const result = await probeWith({ fetch: respondWith(healthy) });
    expect(result.enclave).toEqual({
      pcr0: null,
      problem: 'the gateway did not return an attestation document'
    });
  });

  it('refuses a document that is not a Nitro attestation', async () => {
    const garbage = () => Response.json({ data: { format: 'aws-nitro-cbor', document: 'AQID' } });
    const result = await probeWith({ fetch: respondWith({ ...healthy, '/attestation': garbage }) });
    expect(result.enclave).toEqual({
      pcr0: null,
      problem: 'the attestation document is malformed'
    });
  });

  it('asks for the expected PCRs before it checks a remote gateway', async () => {
    const result = await probeWith({ enclavePCR0: null, fetch: respondWith(healthy) });
    expect(result.enclave).toEqual({ pcr0: null, problem: MISSING_ENCLAVE_PCRS });
  });

  it('has no enclave to check on a local gateway without PCRs', async () => {
    const local = { gatewayURL: 'http://localhost:8787', enclavePCR0: null, enclavePCR16: null };
    expect((await probeWith(local)).enclave).toEqual({ pcr0: null, problem: null });
  });

  it('reports PCRs that are not PCRs instead of throwing', async () => {
    const result = await probeWith({ enclavePCR0: 'sha384:abc', fetch: respondWith(healthy) });
    expect(result.enclave.pcr0).toBeNull();
    expect(result.enclave.problem).toContain('PCR');
  });
});
