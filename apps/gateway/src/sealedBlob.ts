import { decryptSecret, encryptSecret, generateDataKey } from '@fiducy/core';

import { SEALED_BLOB_KEY_LENGTH_BYTES } from './constants';

import type { Bytes, KeyWrapper } from '@fiducy/core';

const IV_LENGTH = 12;

function encodeLength(length: number): Bytes {
  return new Uint8Array([length >> 8, length & 0xff]);
}

function concatenate(parts: Bytes[]): Bytes {
  const joined = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    joined.set(part, offset);
    offset += part.length;
  }
  return joined;
}

export async function sealBlob(
  keyWrapper: KeyWrapper,
  scope: string,
  plaintext: Bytes
): Promise<Bytes> {
  const dataKey = generateDataKey();
  const associatedData = new TextEncoder().encode(scope);
  const { ciphertext, iv } = await encryptSecret({ plaintext, dataKey, associatedData });
  const wrappedKey = await keyWrapper.wrap(scope, dataKey);
  return concatenate([encodeLength(wrappedKey.length), wrappedKey, iv, ciphertext]);
}

export async function openBlob(
  keyWrapper: KeyWrapper,
  scope: string,
  sealed: Bytes
): Promise<Bytes | null> {
  const wrappedLength = ((sealed[0] ?? 0) << 8) | (sealed[1] ?? 0);
  const keyEnd = SEALED_BLOB_KEY_LENGTH_BYTES + wrappedLength;
  if (sealed.length < keyEnd + IV_LENGTH) return null;
  const unwrapped = await keyWrapper.unwrap(
    scope,
    sealed.slice(SEALED_BLOB_KEY_LENGTH_BYTES, keyEnd)
  );
  if (!unwrapped.ok) return null;
  const opened = await decryptSecret({
    ciphertext: sealed.slice(keyEnd + IV_LENGTH),
    iv: sealed.slice(keyEnd, keyEnd + IV_LENGTH),
    dataKey: unwrapped.value,
    associatedData: new TextEncoder().encode(scope)
  });
  return opened.ok ? opened.value : null;
}
