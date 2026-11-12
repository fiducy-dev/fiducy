import { fail } from '../result.ts';
import { decodeBase64, encodeHex } from './bytes.ts';
import { ATTESTATION_FORMAT, ATTESTATION_NONCE_LENGTH, ATTESTATION_ROUTE } from './constants.ts';
import { ATTESTATION_TIMEOUT_MILLISECONDS, AWS_NITRO_ROOT_FINGERPRINT } from './constants.ts';
import { assertExpectedPCRs } from './input.ts';
import { parsePCRList } from './pcr.ts';
import { verifyAttestationWithRoot } from './verifyAttestation.ts';

import type { Bytes, Result } from '../types.ts';
import type {
  AttestationResponseBody,
  FetchAttestation,
  GatewayAttestationError
} from './types.ts';
import type { VerifiedAttestation, VerifyGatewayInput } from './types.ts';

function createNonce(): string {
  return encodeHex(crypto.getRandomValues(new Uint8Array(ATTESTATION_NONCE_LENGTH)));
}

function buildAttestationURL(gatewayURL: string, nonce: string): string {
  const url = new URL(ATTESTATION_ROUTE, gatewayURL);
  url.searchParams.set('nonce', nonce);
  return url.toString();
}

async function readDocument(
  fetchAttestation: FetchAttestation,
  url: string,
  signal: AbortSignal
): Promise<Bytes | null> {
  try {
    const response = await fetchAttestation(url, { signal });
    if (!response.ok) return null;
    const body = (await response.json()) as AttestationResponseBody;
    if (body.data?.format !== ATTESTATION_FORMAT || !body.data.document) return null;
    return decodeBase64(body.data.document);
  } catch {
    return null;
  }
}

function waitForAbort(signal: AbortSignal): Promise<null> {
  return new Promise((resolve) => {
    signal.addEventListener('abort', () => resolve(null), { once: true });
  });
}

async function fetchDocument(
  fetchAttestation: FetchAttestation,
  url: string,
  timeoutMilliseconds: number
): Promise<Bytes | null> {
  const signal = AbortSignal.timeout(timeoutMilliseconds);
  return Promise.race([readDocument(fetchAttestation, url, signal), waitForAbort(signal)]);
}

export async function verifyGatewayWithRoot(
  {
    gatewayURL,
    enclavePCR0,
    enclavePCR16,
    fetch: fetchAttestation = (url, init) => fetch(url, init),
    timeoutMilliseconds = ATTESTATION_TIMEOUT_MILLISECONDS
  }: VerifyGatewayInput,
  trustedRootFingerprint: string
): Promise<Result<VerifiedAttestation, GatewayAttestationError>> {
  const expectedPCR0s = parsePCRList(enclavePCR0);
  const expectedPCR16s = parsePCRList(enclavePCR16);
  assertExpectedPCRs(expectedPCR0s, expectedPCR16s);
  const nonce = createNonce();
  const url = buildAttestationURL(gatewayURL, nonce);
  const document = await fetchDocument(fetchAttestation, url, timeoutMilliseconds);
  if (!document) return fail('attestation_unavailable');
  const encodedNonce = new TextEncoder().encode(nonce);
  return verifyAttestationWithRoot(
    { document, nonce: encodedNonce, expectedPCR0s, expectedPCR16s },
    trustedRootFingerprint
  );
}

export async function verifyGatewayAttestation(
  input: VerifyGatewayInput
): Promise<Result<VerifiedAttestation, GatewayAttestationError>> {
  return verifyGatewayWithRoot(input, AWS_NITRO_ROOT_FINGERPRINT);
}
