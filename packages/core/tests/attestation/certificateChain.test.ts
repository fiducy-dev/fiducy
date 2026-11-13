import { describe, expect, it } from 'bun:test';

import { encodeCBOR } from '../../src/attestation/encodeCBOR.ts';
import { buildDocument, buildPayload, decodeBase64 } from './buildDocument.ts';
import { replaceBytes, verifyTestDocument } from './buildDocument.ts';
import { TEST_INTERMEDIATE_CERTIFICATE, TEST_LEAF_CERTIFICATE } from './certificates.ts';
import { TEST_NON_AUTHORITY_CERTIFICATE, TEST_NON_AUTHORITY_PRIVATE_KEY } from './certificates.ts';
import { TEST_ROOT_CERTIFICATE } from './certificates.ts';
import { TEST_CHAIN_CERTIFICATES, TEST_CHAIN_PRIVATE_KEYS } from './chainCertificates.ts';

type ChainLeaf = keyof typeof TEST_CHAIN_PRIVATE_KEYS;

const untrusted = { ok: false, error: 'untrusted_certificate_chain' } as const;
const malformed = { ok: false, error: 'malformed_document' } as const;

function encodeBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64');
}

function buildChainDocument(authorities: string[], leaf: ChainLeaf) {
  return buildDocument({
    bundle: [TEST_ROOT_CERTIFICATE, ...authorities],
    leafCertificate: TEST_CHAIN_CERTIFICATES[leaf],
    privateKey: TEST_CHAIN_PRIVATE_KEYS[leaf]
  });
}

describe('checking who signed the document', () => {
  it('refuses a document signed with a key other than the leaf certificate', async () => {
    const document = await buildDocument({ privateKey: TEST_NON_AUTHORITY_PRIVATE_KEY });
    expect(await verifyTestDocument(document)).toEqual({ ok: false, error: 'invalid_signature' });
  });

  it('refuses a payload changed after signing', async () => {
    const timestamp = Date.now();
    const signed = await buildDocument({ timestamp });
    const original = encodeCBOR(buildPayload({ timestamp }));
    const forged = encodeCBOR(buildPayload({ timestamp, pcr0: 'ef'.repeat(48) }));
    const tampered = replaceBytes(signed, original, forged);
    const result = await verifyTestDocument(tampered, { expectedPCR0s: ['ef'.repeat(48)] });
    expect(result).toEqual({ ok: false, error: 'invalid_signature' });
  });

  it('refuses a document signed with an algorithm other than ES384', async () => {
    const document = await buildDocument({ algorithm: -7 });
    const result = await verifyTestDocument(document);
    expect(result).toEqual({ ok: false, error: 'unsupported_algorithm' });
  });
});

describe('checking the certificate chain', () => {
  it('refuses a chain that does not start at the trusted root', async () => {
    const document = await buildDocument({ bundle: [TEST_INTERMEDIATE_CERTIFICATE] });
    expect(await verifyTestDocument(document)).toEqual(untrusted);
  });

  it('refuses an intermediate that copies the real name but was not signed by the root', async () => {
    const forged = TEST_CHAIN_CERTIFICATES.forgedIntermediate;
    expect(await verifyTestDocument(await buildChainDocument([forged], 'forgedLeaf'))).toEqual(
      untrusted
    );
  });

  it('refuses a leaf that names the real intermediate as issuer but was not signed by it', async () => {
    const document = await buildChainDocument([TEST_INTERMEDIATE_CERTIFICATE], 'forgedLeaf');
    expect(await verifyTestDocument(document)).toEqual(untrusted);
  });

  it('refuses a leaf signed by the intermediate key under another issuer name', async () => {
    const document = await buildChainDocument([TEST_INTERMEDIATE_CERTIFICATE], 'mismatchedLeaf');
    expect(await verifyTestDocument(document)).toEqual(untrusted);
  });

  it('refuses a leaf issued by a certificate that is not a certificate authority', async () => {
    const document = await buildDocument({
      bundle: [TEST_ROOT_CERTIFICATE, TEST_INTERMEDIATE_CERTIFICATE, TEST_LEAF_CERTIFICATE],
      leafCertificate: TEST_NON_AUTHORITY_CERTIFICATE,
      privateKey: TEST_NON_AUTHORITY_PRIVATE_KEY
    });
    expect(await verifyTestDocument(document)).toEqual(untrusted);
  });

  it('refuses an issuer that may sign certificates but is not a certificate authority', async () => {
    const bundle = [TEST_INTERMEDIATE_CERTIFICATE, TEST_CHAIN_CERTIFICATES.signingNonAuthority];
    expect(await verifyTestDocument(await buildChainDocument(bundle, 'nonAuthorityLeaf'))).toEqual(
      untrusted
    );
  });

  it('refuses a certificate authority whose key usage does not allow signing certificates', async () => {
    const withoutCertSign = [TEST_CHAIN_CERTIFICATES.noCertSignIntermediate];
    const withoutKeyUsage = [TEST_CHAIN_CERTIFICATES.noKeyUsageIntermediate];
    const first = await buildChainDocument(withoutCertSign, 'noCertSignLeaf');
    const second = await buildChainDocument(withoutKeyUsage, 'noKeyUsageLeaf');
    expect(await verifyTestDocument(first)).toEqual(untrusted);
    expect(await verifyTestDocument(second)).toEqual(untrusted);
  });

  it('refuses a chain longer than a path length constraint allows', async () => {
    const { constrainedIntermediate, subIntermediate } = TEST_CHAIN_CERTIFICATES;
    const document = await buildChainDocument(
      [constrainedIntermediate, subIntermediate],
      'deepLeaf'
    );
    expect(await verifyTestDocument(document)).toEqual(untrusted);
  });

  it('accepts a leaf directly under a certificate authority with path length zero', async () => {
    const authorities = [TEST_CHAIN_CERTIFICATES.constrainedIntermediate];
    const result = await verifyTestDocument(
      await buildChainDocument(authorities, 'constrainedLeaf')
    );
    expect(result.ok).toBe(true);
  });

  it('refuses a certificate with a critical extension it does not understand', async () => {
    const authority = [TEST_CHAIN_CERTIFICATES.criticalIntermediate];
    const intermediate = [TEST_INTERMEDIATE_CERTIFICATE];
    const first = await buildChainDocument(authority, 'criticalIntermediateLeaf');
    const second = await buildChainDocument(intermediate, 'criticalLeaf');
    expect(await verifyTestDocument(first)).toEqual(untrusted);
    expect(await verifyTestDocument(second)).toEqual(untrusted);
  });

  it('ignores an unknown extension that is not marked critical', async () => {
    const document = await buildChainDocument([TEST_INTERMEDIATE_CERTIFICATE], 'noncriticalLeaf');
    expect((await verifyTestDocument(document)).ok).toBe(true);
  });

  it('refuses a certificate signed with ECDSA over SHA-256', async () => {
    const document = await buildChainDocument([TEST_INTERMEDIATE_CERTIFICATE], 'sha256Leaf');
    expect(await verifyTestDocument(document)).toEqual(untrusted);
  });

  it('refuses a certificate that repeats an extension', async () => {
    const authorities = [TEST_INTERMEDIATE_CERTIFICATE];
    const document = await buildChainDocument(authorities, 'duplicateExtensionLeaf');
    expect(await verifyTestDocument(document)).toEqual(malformed);
  });

  it('refuses a certificate with trailing bytes or disagreeing signature algorithms', async () => {
    const leaf = decodeBase64(TEST_LEAF_CERTIFICATE);
    const trailing = encodeBase64(new Uint8Array([...leaf, 0]));
    const sha384Algorithm = Buffer.from('06082a8648ce3d040303', 'hex');
    const outerAlgorithm = Buffer.from(leaf).lastIndexOf(sha384Algorithm);
    const disagreeing = new Uint8Array(leaf);
    disagreeing[outerAlgorithm + sha384Algorithm.length - 1] = 0x02;
    for (const leafCertificate of [trailing, encodeBase64(disagreeing)]) {
      expect(await verifyTestDocument(await buildDocument({ leafCertificate }))).toEqual(malformed);
    }
  });

  it('refuses a document timestamped before or after the certificates validity', async () => {
    const expired = { ok: false, error: 'certificate_not_valid_at_timestamp' } as const;
    for (const timestamp of [Date.UTC(2001, 0, 1), Date.UTC(2200, 0, 1)]) {
      expect(await verifyTestDocument(await buildDocument({ timestamp }))).toEqual(expired);
    }
  });
});
