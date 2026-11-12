import { fail } from '../result.ts';
import { decodeBase64, encodeHex } from './bytes.ts';
import { ATTESTATION_FORMAT, ATTESTATION_NONCE_LENGTH, ATTESTATION_ROUTE } from './constants.ts';
import { AWS_NITRO_ROOT_FINGERPRINT } from './constants.ts';
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

async function fetchDocument(
  fetchAttestation: FetchAttestation,
  url: string
): Promise<Bytes | null> {
  try {
    const response = await fetchAttestation(url);
    if (!response.ok) return null;
    const body = (await response.json()) as AttestationResponseBody;
    if (body.data?.format !== ATTESTATION_FORMAT || !body.data.document) return null;
    return decodeBase64(body.data.document);
  } catch {
    return null;
  }
}

export async function verifyGatewayWithRoot(
  {
    gatewayURL,
    enclavePCR0,
    enclavePCR16,
    fetch: fetchAttestation = (url) => fetch(url)
  }: VerifyGatewayInput,
  trustedRootFingerprint: string
): Promise<Result<VerifiedAttestation, GatewayAttestationError>> {
  const expectedPCR0s = parsePCRList(enclavePCR0);
  const expectedPCR16s = parsePCRList(enclavePCR16);
  assertExpectedPCRs(expectedPCR0s, expectedPCR16s);
  const nonce = createNonce();
  const document = await fetchDocument(fetchAttestation, buildAttestationURL(gatewayURL, nonce));
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
