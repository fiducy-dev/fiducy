import { MAXIMUM_NONCE_LENGTH } from '../constants';
import { respondWith } from '../responses';

import type { GatewayDependencies } from '../types';

export async function serveAttestation(request: Request, { attest }: GatewayDependencies) {
  if (!attest) return respondWith(404, null, 'This gateway is not running in an enclave');
  const nonce = new URL(request.url).searchParams.get('nonce');
  if (nonce && nonce.length > MAXIMUM_NONCE_LENGTH) {
    return respondWith(400, null, `Keep the nonce under ${MAXIMUM_NONCE_LENGTH} characters`);
  }
  const document = await attest(nonce ? new TextEncoder().encode(nonce) : null);
  if (!document) return respondWith(502, null, 'The enclave could not produce an attestation');
  const response = respondWith(
    200,
    { format: 'aws-nitro-cbor', document: Buffer.from(document).toString('base64') },
    'Attestation document issued by the Nitro hypervisor'
  );
  response.headers.set('access-control-allow-origin', '*');
  response.headers.set('cache-control', 'no-store');
  return response;
}
