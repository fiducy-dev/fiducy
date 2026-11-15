import { ATTESTATION_RATE_LIMIT_MESSAGE, MAXIMUM_NONCE_LENGTH } from '../constants';
import { respondWith, respondWithRateLimit } from '../responses';
import { identifyClient } from '../tokenBucketRateLimiter';

import type { GatewayDependencies } from '../types';

// Any page may read the answer, so the widget can check the document in the browser, and it must
// never be cached, because every document answers one nonce.
function allowAnyPage(response: Response): Response {
  response.headers.set('access-control-allow-origin', '*');
  response.headers.set('cache-control', 'no-store');
  return response;
}

async function issueDocument(nonce: string | null, attest: GatewayDependencies['attest']) {
  const document = await attest?.(nonce ? new TextEncoder().encode(nonce) : null);
  if (!document) return respondWith(502, null, 'The enclave could not produce an attestation');
  return respondWith(
    200,
    { format: 'aws-nitro-cbor', document: Buffer.from(document).toString('base64') },
    'Attestation document issued by the Nitro hypervisor'
  );
}

export async function serveAttestation(
  request: Request,
  { attest, attestationRateLimiter }: GatewayDependencies
) {
  if (!attest) return respondWith(404, null, 'This gateway is not running in an enclave');
  const rateLimit = attestationRateLimiter?.consumeToken(identifyClient(request));
  if (rateLimit?.isAllowed === false) {
    return allowAnyPage(
      respondWithRateLimit(rateLimit.retryAfterSeconds, ATTESTATION_RATE_LIMIT_MESSAGE)
    );
  }
  const nonce = new URL(request.url).searchParams.get('nonce');
  if (nonce && nonce.length > MAXIMUM_NONCE_LENGTH) {
    return respondWith(400, null, `Keep the nonce under ${MAXIMUM_NONCE_LENGTH} characters`);
  }
  return allowAnyPage(await issueDocument(nonce, attest));
}
