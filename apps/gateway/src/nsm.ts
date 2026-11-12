import { closeSync, openSync } from 'node:fs';

import { FFIType, dlopen, ptr } from 'bun:ffi';

import { encodeCbor } from './cbor';
import { NSM_DEVICE_PATH, NSM_IOCTL_REQUEST, NSM_RESPONSE_MAXIMUM_BYTES } from './constants';

import type { CborValue } from './types';

function openLibc() {
  return dlopen('libc.so.6', {
    ioctl: { args: [FFIType.i32, FFIType.u64, FFIType.ptr], returns: FFIType.i32 }
  });
}

function sendToSecureModule(request: CborValue): Uint8Array<ArrayBuffer> {
  const libc = openLibc();
  const device = openSync(NSM_DEVICE_PATH, 'r+');
  try {
    const encodedRequest = encodeCbor(request);
    const response = new Uint8Array(NSM_RESPONSE_MAXIMUM_BYTES);
    const message = new BigUint64Array([
      BigInt(ptr(encodedRequest)),
      BigInt(encodedRequest.length),
      BigInt(ptr(response)),
      BigInt(response.length)
    ]);
    const status = libc.symbols.ioctl(device, NSM_IOCTL_REQUEST, ptr(message));
    if (status !== 0) throw new Error(`The secure module refused the request (status ${status})`);
    return response.slice(0, Number(message[3] ?? 0n));
  } finally {
    closeSync(device);
    libc.close();
  }
}

function sameBytes(left: Uint8Array, right: Uint8Array): boolean {
  return left.length === right.length && left.every((byte, index) => byte === right[index]);
}

export function extendAndLockPCR(index: number, data: Uint8Array, expected: Uint8Array): void {
  const extended = sendToSecureModule({ ExtendPCR: { index, data } });
  if (!sameBytes(extended, encodeCbor({ ExtendPCR: { data: expected } })))
    throw new Error(`PCR${index} did not reach the expected value; it was extended before`);
  const locked = sendToSecureModule({ LockPCR: { index } });
  if (!sameBytes(locked, encodeCbor('LockPCR'))) throw new Error(`PCR${index} could not be locked`);
}
