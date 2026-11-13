import { createACMEAccountReporter } from './acmeAccounts';
import { BLOB_KEY_PREFIX, TLS_STATE_BLOB_NAME, TLS_STATE_SCOPE } from './constants';
import { decodeSnapshot, encodeSnapshot, fingerprintSnapshot } from './directorySnapshot';
import { restoreDirectory, snapshotDirectory } from './directorySnapshot';
import { openBlob, sealBlob } from './sealedBlob';

import type { TlsStateKeeper, TlsStateOptions } from './types';

export function createTlsStateKeeper({
  directory,
  blobStore,
  keyWrapper
}: TlsStateOptions): TlsStateKeeper {
  let persistedFingerprint = '';
  const reportACMEAccounts = createACMEAccountReporter();

  const restore = async () => {
    const sealed = await blobStore.readBlob(TLS_STATE_BLOB_NAME);
    if (!sealed) return false;
    const opened = await openBlob(keyWrapper, TLS_STATE_SCOPE, sealed);
    const snapshot = opened ? decodeSnapshot(opened) : null;
    if (!snapshot) {
      throw new Error(
        `The stored TLS state could not be opened. Delete the ${BLOB_KEY_PREFIX}${TLS_STATE_BLOB_NAME} item to request a new certificate`
      );
    }
    await restoreDirectory(directory, snapshot);
    reportACMEAccounts(snapshot);
    persistedFingerprint = await fingerprintSnapshot(snapshot);
    return true;
  };

  const persist = async () => {
    const snapshot = await snapshotDirectory(directory);
    if (Object.keys(snapshot).length === 0) return false;
    const fingerprint = await fingerprintSnapshot(snapshot);
    if (fingerprint === persistedFingerprint) return false;
    const sealed = await sealBlob(keyWrapper, TLS_STATE_SCOPE, encodeSnapshot(snapshot));
    await blobStore.writeBlob(TLS_STATE_BLOB_NAME, sealed);
    persistedFingerprint = fingerprint;
    reportACMEAccounts(snapshot);
    return true;
  };

  const start = (intervalMilliseconds: number) => {
    const timer = setInterval(() => {
      persist().catch((error: unknown) => {
        console.error(`Could not persist the TLS state: ${describe(error)}`);
      });
    }, intervalMilliseconds);
    return () => clearInterval(timer);
  };

  return { restore, persist, start };
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : 'unknown error';
}
