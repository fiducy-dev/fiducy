import { describe, expect, it } from 'bun:test';

import { TEST_PCR0, buildDocument, createTestPCRs } from './buildDocument.ts';
import { verifyTestDocument } from './buildDocument.ts';

import type { Bytes } from '../../src/types.ts';

const pcr16 = '11'.repeat(48);

function withPCR(index: number, measurement: Bytes | null): Map<number, Bytes> {
  const pcrs = createTestPCRs();
  if (measurement) pcrs.set(index, measurement);
  else pcrs.delete(index);
  return pcrs;
}

describe('verifying an attestation document', () => {
  it('returns the PCRs and module of a document from the expected enclave', async () => {
    const result = await verifyTestDocument(await buildDocument());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.pcr0).toBe(TEST_PCR0);
    expect(result.value.pcr16).toBe(pcr16);
    expect(result.value.moduleID).toBe('i-0fiducy7test-enc019');
  });

  it('accepts any PCR0 from a rollover list, ignoring case and spaces', async () => {
    const expectedPCR0s = ['cd'.repeat(48), ` ${TEST_PCR0.toUpperCase()} `];
    expect((await verifyTestDocument(await buildDocument(), { expectedPCR0s })).ok).toBe(true);
  });

  it('refuses an enclave built from a different image', async () => {
    const document = await buildDocument({ pcr0: 'ef'.repeat(48) });
    expect(await verifyTestDocument(document)).toEqual({ ok: false, error: 'unexpected_pcr0' });
  });

  it('refuses a replayed document that carries another nonce or none', async () => {
    const replayed = await buildDocument({ nonce: new TextEncoder().encode('an-older-nonce') });
    const withoutNonce = await buildDocument({ nonce: null });
    expect(await verifyTestDocument(replayed)).toEqual({ ok: false, error: 'nonce_mismatch' });
    expect(await verifyTestDocument(withoutNonce)).toEqual({ ok: false, error: 'nonce_mismatch' });
  });
});

describe('refusing a debug-mode enclave', () => {
  const debugError = { ok: false, error: 'debug_mode_enclave' } as const;

  it('refuses all-zero PCR0 even when zeros are listed as expected', async () => {
    const document = await buildDocument({ pcr0: '00'.repeat(48) });
    expect(await verifyTestDocument(document, { expectedPCR0s: ['00'.repeat(48)] })).toEqual(
      debugError
    );
  });

  for (const index of [1, 2]) {
    it(`refuses an all-zero PCR${index} while PCR0 matches`, async () => {
      const document = await buildDocument({ pcrs: withPCR(index, new Uint8Array(48)) });
      expect(await verifyTestDocument(document)).toEqual(debugError);
    });

    it(`refuses a document without PCR${index}`, async () => {
      const document = await buildDocument({ pcrs: withPCR(index, null) });
      expect(await verifyTestDocument(document)).toEqual(debugError);
    });
  }
});

describe('checking the deployment config in PCR16', () => {
  it('accepts the genuine image running the expected deployment config', async () => {
    const result = await verifyTestDocument(await buildDocument(), { expectedPCR16s: [pcr16] });
    expect(result.ok).toBe(true);
  });

  it('refuses the genuine image running another deployment config', async () => {
    const result = await verifyTestDocument(await buildDocument(), {
      expectedPCR16s: ['22'.repeat(48)]
    });
    expect(result).toEqual({ ok: false, error: 'unexpected_pcr16' });
  });

  it('refuses a document without PCR16 when a value is expected', async () => {
    const document = await buildDocument({ pcrs: withPCR(16, null) });
    const result = await verifyTestDocument(document, { expectedPCR16s: [pcr16] });
    expect(result).toEqual({ ok: false, error: 'unexpected_pcr16' });
  });

  it('reports a missing PCR16 as null when no value is expected', async () => {
    const document = await buildDocument({ pcrs: withPCR(16, null) });
    const result = await verifyTestDocument(document, { expectedPCR16s: [] });
    expect(result.ok && result.value.pcr16).toBeNull();
  });
});

describe('refusing caller mistakes instead of reporting them as a bad document', () => {
  it('throws for an empty nonce, even when the document nonce is empty too', async () => {
    const document = await buildDocument({ nonce: new Uint8Array(0) });
    await expect(verifyTestDocument(document, { nonce: new Uint8Array(0) })).rejects.toThrow(
      TypeError
    );
  });

  it('throws when no PCR0 is expected or an expected PCR is not a measurement', async () => {
    const document = await buildDocument();
    const mistakes = [
      { expectedPCR0s: [] },
      { expectedPCR0s: ['abc'] },
      { expectedPCR16s: [''] },
      { nonce: 'nonce' as unknown as Bytes }
    ];
    for (const mistake of mistakes) {
      await expect(verifyTestDocument(document, mistake)).rejects.toThrow(TypeError);
    }
  });

  it('reports a missing WebCrypto instead of a malformed document', async () => {
    const document = await buildDocument();
    const subtle = crypto.subtle;
    Object.defineProperty(crypto, 'subtle', { value: undefined, configurable: true });
    try {
      expect(await verifyTestDocument(document)).toEqual({
        ok: false,
        error: 'webcrypto_unavailable'
      });
    } finally {
      Object.defineProperty(crypto, 'subtle', { value: subtle, configurable: true });
    }
  });
});
