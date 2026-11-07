import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { DEFAULT_DATA_DIRECTORY } from './constants';
import { readExampleSetting } from './environment';

import type { FiducyStorage, StoredUserKey } from '@fiducy/sdk/server';
import type { StoredKeysFile } from './types';

function newestFirst(keys: StoredUserKey[]): StoredUserKey[] {
  return [...keys].sort((first, second) => second.createdAt.localeCompare(first.createdAt));
}

function readDirectory(): string {
  return resolve(readExampleSetting('EXAMPLE_DATA_DIR') ?? DEFAULT_DATA_DIRECTORY);
}

function readFilePath(): string {
  return join(readDirectory(), 'fiducy-keys.json');
}

export function fileStorage(): FiducyStorage {
  const readKeys = (): StoredUserKey[] => {
    const filePath = readFilePath();
    if (!existsSync(filePath)) return [];
    return (JSON.parse(readFileSync(filePath, 'utf8')) as StoredKeysFile).keys;
  };

  const writeKeys = (keys: StoredUserKey[]) => {
    mkdirSync(readDirectory(), { recursive: true });
    const filePath = readFilePath();
    const temporaryPath = `${filePath}.tmp`;
    writeFileSync(temporaryPath, JSON.stringify({ keys }), { mode: 0o600 });
    renameSync(temporaryPath, filePath);
  };

  const listKeys = async (userID: string) =>
    newestFirst(readKeys().filter((key) => key.userID === userID));

  return {
    saveKey: async (key) => writeKeys([...readKeys(), key]),
    findKey: async (userID, provider) =>
      (await listKeys(userID)).find((key) => key.provider === provider) ?? null,
    listKeys,
    deleteKey: async (userID, keyID) => {
      const keys = readKeys();
      const remaining = keys.filter((key) => key.userID !== userID || key.keyID !== keyID);
      if (remaining.length === keys.length) return false;
      writeKeys(remaining);
      return true;
    }
  };
}
