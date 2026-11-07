import { expect, it } from 'bun:test';

import type { SealedRecord } from '@fiducy/core';
import type { FiducyStorage, StoredUserKey } from '../../src/server';

export const SAMPLE_RECORD: SealedRecord = {
  keyID: 'Kq2Wm7Xr1Tn8Lb5Vc3Hj6P',
  appID: 'app_chatforge',
  ciphertext: 'f3a9Kq2Wm7Xr1Tn8Lb5Vc3Hj6Ps0Ue4Yi9Oa2Rd7Fg1',
  iv: 'Xr1Tn8Lb5Vc3Hj6P',
  wrappedShareB: 'Lb5Vc3Hj6Ps0Ue4Yi9Oa2Rd7Fg1f3a9Kq2Wm7Xr1Tn8'
};

export function createStoredKey(overrides: Partial<StoredUserKey> = {}): StoredUserKey {
  const keyID = overrides.keyID ?? crypto.randomUUID().replaceAll('-', '').slice(0, 22);
  return {
    userID: 'user_ada',
    provider: 'openai',
    keyID,
    handle: `kh_${keyID}.f3a9Kq2Wm7Xr1Tn8Lb5Vc3Hj6Ps0Ue4Yi9Oa2Rd7Fg1`,
    createdAt: new Date().toISOString(),
    ...overrides
  };
}

export function itBehavesLikeFiducyStorage(readStorage: () => FiducyStorage) {
  it('saves keys and lists them newest first for that user only', async () => {
    const older = createStoredKey({ userID: 'user_list', createdAt: '2026-11-01T10:00:00.000Z' });
    const newer = createStoredKey({
      userID: 'user_list',
      provider: 'anthropic',
      createdAt: '2026-11-02T10:00:00.000Z'
    });
    await readStorage().saveKey(older);
    await readStorage().saveKey(newer);
    await readStorage().saveKey(createStoredKey({ userID: 'user_other' }));
    expect(await readStorage().listKeys('user_list')).toEqual([newer, older]);
  });

  it('finds the newest key for a provider', async () => {
    const first = createStoredKey({ userID: 'user_find', createdAt: '2026-11-01T10:00:00.000Z' });
    const second = createStoredKey({
      userID: 'user_find',
      createdAt: '2026-11-03T10:00:00.000Z'
    });
    await readStorage().saveKey(first);
    await readStorage().saveKey(second);
    expect(await readStorage().findKey('user_find', 'openai')).toEqual(second);
    expect(await readStorage().findKey('user_find', 'gemini')).toBeNull();
  });

  it('keeps the sealed record when records live in the app', async () => {
    const key = createStoredKey({ userID: 'user_record', record: SAMPLE_RECORD });
    await readStorage().saveKey(key);
    expect(await readStorage().findKey('user_record', 'openai')).toEqual(key);
  });

  it('keeps where an imported key came from', async () => {
    const key = createStoredKey({ userID: 'user_source', source: 'import' });
    await readStorage().saveKey(key);
    expect(await readStorage().findKey('user_source', 'openai')).toEqual(key);
  });

  it('updates a key saved twice instead of adding a second row', async () => {
    const key = createStoredKey({ userID: 'user_twice' });
    await readStorage().saveKey(key);
    await readStorage().saveKey({ ...key, createdAt: '2026-11-04T10:00:00.000Z' });
    const keys = await readStorage().listKeys('user_twice');
    expect(keys).toHaveLength(1);
    expect(keys[0]?.createdAt).toBe('2026-11-04T10:00:00.000Z');
  });

  it('never lets one user overwrite or delete another user key with the same ID', async () => {
    const victimKey = createStoredKey({ userID: 'user_victim' });
    await readStorage().saveKey(victimKey);
    await readStorage().saveKey({ ...victimKey, userID: 'user_attacker', handle: 'kh_forged' });
    expect(await readStorage().deleteKey('user_attacker', victimKey.keyID)).toBe(true);
    expect(await readStorage().deleteKey('user_attacker', victimKey.keyID)).toBe(false);
    expect(await readStorage().listKeys('user_victim')).toEqual([victimKey]);
  });

  it('deletes only the signed-in user key and reports whether it existed', async () => {
    const key = createStoredKey({ userID: 'user_delete' });
    await readStorage().saveKey(key);
    expect(await readStorage().deleteKey('user_someone_else', key.keyID)).toBe(false);
    expect(await readStorage().deleteKey('user_delete', key.keyID)).toBe(true);
    expect(await readStorage().listKeys('user_delete')).toEqual([]);
  });

  it('treats user IDs as data, not SQL', async () => {
    const userID = "user'); drop table fiducy_user_key; --";
    const key = createStoredKey({ userID });
    await readStorage().saveKey(key);
    expect(await readStorage().listKeys(userID)).toEqual([key]);
  });
}
