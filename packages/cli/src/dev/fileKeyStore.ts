import { join } from 'node:path';

import { DEV_RECORDS_FILE } from '../constants.ts';
import { ensureStateDirectory, readText, writePrivateFile } from '../files.ts';

import type { SealedRecord } from '@fiducy/core';
import type { KeyStore } from '@fiducy/gateway/src/types.ts';

export function createFileKeyStore(root: string): KeyStore {
  const directory = ensureStateDirectory(root);
  const path = join(directory, DEV_RECORDS_FILE);
  const readRecords = (): Record<string, SealedRecord> => {
    const text = readText(path);
    return text === null ? {} : (JSON.parse(text) as Record<string, SealedRecord>);
  };
  const writeRecords = (records: Record<string, SealedRecord>) =>
    writePrivateFile(path, JSON.stringify(records));
  return {
    saveRecord: async (record) => writeRecords({ ...readRecords(), [record.keyID]: record }),
    findRecord: async (keyID) => {
      const records = readRecords();
      return Object.hasOwn(records, keyID) ? (records[keyID] ?? null) : null;
    },
    deleteRecord: async (keyID) => {
      const records = readRecords();
      if (!Object.hasOwn(records, keyID)) return false;
      delete records[keyID];
      writeRecords(records);
      return true;
    }
  };
}
