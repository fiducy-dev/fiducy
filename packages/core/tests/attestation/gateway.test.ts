import { describe, expect, it } from 'bun:test';

import { verifyGatewayWithRoot } from '../../src/attestation/gateway.ts';
import { decideAttestation, describeAttestationError } from '../../src/attestation/index.ts';
import { describeRefusedAttestation } from '../../src/attestation/index.ts';
import { verifyGatewayAttestation } from '../../src/attestation/index.ts';
import { TEST_PCR0, TEST_ROOT_FINGERPRINT, buildDocument } from './buildDocument.ts';

const GATEWAY_URL = 'https://gateway.notesapp.dev';

function respondWithDocument(document: Uint8Array): Response {
  const encoded = Buffer.from(document).toString('base64');
  return Response.json({ data: { format: 'aws-nitro-cbor', document: encoded }, message: 'ok' });
}

function createEnclaveFetch(pcr0 = TEST_PCR0) {
  const requestedURLs: string[] = [];
  const fetchAttestation = async (url: string) => {
    requestedURLs.push(url);
    const nonce = new URL(url).searchParams.get('nonce') ?? '';
    return respondWithDocument(
      await buildDocument({ pcr0, nonce: new TextEncoder().encode(nonce) })
    );
  };
  return { requestedURLs, fetchAttestation };
}

describe('verifying a gateway', () => {
  it('asks the gateway for a fresh document and accepts the expected enclave', async () => {
    const { requestedURLs, fetchAttestation } = createEnclaveFetch();
    const input = { gatewayURL: GATEWAY_URL, enclavePCR0: TEST_PCR0, fetch: fetchAttestation };
    const first = await verifyGatewayWithRoot(input, TEST_ROOT_FINGERPRINT);
    await verifyGatewayWithRoot(input, TEST_ROOT_FINGERPRINT);
    expect(first.ok).toBe(true);
    expect(requestedURLs[0]).toStartWith(`${GATEWAY_URL}/attestation?nonce=`);
    expect(requestedURLs[0]).not.toBe(requestedURLs[1]);
  });

  it('refuses a gateway that replays a document made for another nonce', async () => {
    const replayed = await buildDocument({ nonce: new TextEncoder().encode('captured-earlier') });
    const input = {
      gatewayURL: GATEWAY_URL,
      enclavePCR0: TEST_PCR0,
      fetch: async () => respondWithDocument(replayed)
    };
    const result = await verifyGatewayWithRoot(input, TEST_ROOT_FINGERPRINT);
    expect(result).toEqual({ ok: false, error: 'nonce_mismatch' });
  });

  it('refuses a gateway running another image', async () => {
    const { fetchAttestation } = createEnclaveFetch('ef'.repeat(48));
    const input = { gatewayURL: GATEWAY_URL, enclavePCR0: TEST_PCR0, fetch: fetchAttestation };
    const result = await verifyGatewayWithRoot(input, TEST_ROOT_FINGERPRINT);
    expect(result).toEqual({ ok: false, error: 'unexpected_pcr0' });
  });

  it('refuses the genuine image when PCR16 names another deployment config', async () => {
    const { fetchAttestation } = createEnclaveFetch();
    const input = {
      gatewayURL: GATEWAY_URL,
      enclavePCR0: TEST_PCR0,
      enclavePCR16: '22'.repeat(48),
      fetch: fetchAttestation
    };
    const result = await verifyGatewayWithRoot(input, TEST_ROOT_FINGERPRINT);
    expect(result).toEqual({ ok: false, error: 'unexpected_pcr16' });
  });

  it('trusts only the AWS root by default', async () => {
    const { fetchAttestation } = createEnclaveFetch();
    const input = { gatewayURL: GATEWAY_URL, enclavePCR0: TEST_PCR0, fetch: fetchAttestation };
    const result = await verifyGatewayAttestation(input);
    expect(result).toEqual({ ok: false, error: 'untrusted_certificate_chain' });
  });

  it('reports a gateway that is not in an enclave or is unreachable', async () => {
    const fetches = [
      async () => Response.json({ data: null, message: 'not in an enclave' }, { status: 404 }),
      async () => new Response('<html>', { status: 200 }),
      async () => {
        throw new TypeError('fetch failed');
      }
    ];
    for (const fetchAttestation of fetches) {
      const input = { gatewayURL: GATEWAY_URL, enclavePCR0: TEST_PCR0, fetch: fetchAttestation };
      expect(await verifyGatewayAttestation(input)).toEqual({
        ok: false,
        error: 'attestation_unavailable'
      });
    }
  });

  it('explains a refusal in words a developer can act on', () => {
    expect(describeAttestationError('unexpected_pcr0')).toContain('FIDUCY_ENCLAVE_PCR0');
    expect(describeAttestationError('unexpected_pcr16')).toContain('FIDUCY_ENCLAVE_PCR16');
    expect(describeAttestationError('webcrypto_unavailable')).toContain('HTTPS');
  });
});

const TEST_PCR16 = '11'.repeat(48);

describe('deciding whether to check a gateway', () => {
  it('checks whenever expected PCRs are set, even with the skip flag', () => {
    const input = {
      gatewayURL: GATEWAY_URL,
      enclavePCR0: TEST_PCR0,
      enclavePCR16: TEST_PCR16,
      skipAttestation: true
    };
    expect(decideAttestation(input)).toBe('verify');
  });

  it('refuses PCR0 without PCR16, even for a local gateway, and says to set PCR16', () => {
    for (const gatewayURL of [GATEWAY_URL, 'http://localhost:8787']) {
      const input = { gatewayURL, enclavePCR0: TEST_PCR0, skipAttestation: true };
      expect(decideAttestation(input)).toBe('refuse');
      expect(describeRefusedAttestation(input)).toContain('FIDUCY_ENCLAVE_PCR16');
    }
  });

  it('refuses PCR16 without PCR0 and expected values that are not PCRs', () => {
    const onlyPCR16 = { gatewayURL: GATEWAY_URL, enclavePCR16: TEST_PCR16 };
    const invalid = { gatewayURL: GATEWAY_URL, enclavePCR0: 'abc', enclavePCR16: TEST_PCR16 };
    expect(decideAttestation(onlyPCR16)).toBe('refuse');
    expect(describeRefusedAttestation(onlyPCR16)).toContain('FIDUCY_ENCLAVE_PCR0');
    expect(decideAttestation(invalid)).toBe('refuse');
    expect(describeRefusedAttestation(invalid)).toContain('not "abc"');
  });

  it('skips local gateways and gateways marked as test gateways', () => {
    expect(decideAttestation({ gatewayURL: 'http://localhost:8787' })).toBe('skip');
    expect(decideAttestation({ gatewayURL: 'http://127.0.0.1:3438' })).toBe('skip');
    expect(decideAttestation({ gatewayURL: GATEWAY_URL, skipAttestation: true })).toBe('skip');
  });

  it('refuses a remote gateway with no expected PCR0', () => {
    expect(decideAttestation({ gatewayURL: GATEWAY_URL })).toBe('refuse');
    expect(decideAttestation({ gatewayURL: GATEWAY_URL, enclavePCR0: ' , ' })).toBe('refuse');
    expect(decideAttestation({ gatewayURL: 'http://localhost.evil.dev' })).toBe('refuse');
  });
});
