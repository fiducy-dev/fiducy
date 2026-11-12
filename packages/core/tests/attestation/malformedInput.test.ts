import { describe, expect, it } from 'bun:test';

import { joinBytes } from '../../src/attestation/bytes.ts';
import { encodeCBOR } from '../../src/attestation/encodeCBOR.ts';
import { buildDocument, buildPayload, signPayload, verifyTestDocument } from './buildDocument.ts';

import type { CBORValue } from '../../src/attestation/types.ts';

const malformed = { ok: false, error: 'malformed_document' } as const;

function buildPayloadWith(field: string, value: CBORValue) {
  const payload = buildPayload();
  payload.set(field, value);
  return signPayload(encodeCBOR(payload));
}

describe('reading malformed input', () => {
  it('refuses garbage, truncated documents and trailing bytes', async () => {
    const document = await buildDocument();
    const inputs = [
      new Uint8Array([1, 2, 3]),
      document.slice(0, 200),
      new Uint8Array([...document, 0])
    ];
    for (const input of inputs) expect(await verifyTestDocument(input)).toEqual(malformed);
  });

  it('refuses indefinite lengths and integers that are not minimally encoded', async () => {
    const document = await buildDocument();
    const indefinite = new Uint8Array([0x9f, 0x40, 0xa0, 0x40, 0x40, 0xff]);
    const nonMinimal = new Uint8Array([0x98, 0x04, ...document.slice(2)]);
    expect(await verifyTestDocument(indefinite)).toEqual(malformed);
    expect(await verifyTestDocument(nonMinimal)).toEqual(malformed);
  });

  it('refuses a validly signed payload that repeats a map key', async () => {
    const payload = encodeCBOR(buildPayload());
    const header = new Uint8Array([(payload[0] ?? 0) + 1]);
    const repeated = [encodeCBOR('nonce'), encodeCBOR(new TextEncoder().encode('other'))];
    const document = await signPayload(joinBytes([header, payload.slice(1), ...repeated]));
    expect(await verifyTestDocument(document)).toEqual(malformed);
  });

  it('refuses a validly signed document larger than any real attestation', async () => {
    const document = await buildPayloadWith('user_data', new Uint8Array(14000));
    expect(document.length).toBeGreaterThan(16384);
    expect(await verifyTestDocument(document)).toEqual(malformed);
  });

  it('refuses validly signed payloads nested too deep or holding too many items', async () => {
    let nested: CBORValue = 1;
    for (let depth = 0; depth < 12; depth += 1) nested = [nested];
    const deep = await buildPayloadWith('extra', nested);
    const wide = await buildPayloadWith(
      'extra',
      Array.from({ length: 65 }, () => 1)
    );
    expect(await verifyTestDocument(deep)).toEqual(malformed);
    expect(await verifyTestDocument(wide)).toEqual(malformed);
  });

  it('refuses a timestamp that is not a real date', async () => {
    const document = await buildPayloadWith('timestamp', 9e15);
    expect(await verifyTestDocument(document)).toEqual(malformed);
  });

  it('accepts a validly signed payload with an unknown extra field', async () => {
    const document = await buildPayloadWith('extra', 'x');
    expect((await verifyTestDocument(document)).ok).toBe(true);
  });
});
