import { mkdtempSync, rmSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it, spyOn } from 'bun:test';

import { createLocalKeyWrapper } from '@fiducy/core';

import { findACMEAccountURLs } from '../src/acmeAccounts';
import { TLS_STATE_BLOB_NAME } from '../src/constants';
import { createMemoryBlobStore } from '../src/memoryStores';
import { openBlob, sealBlob } from '../src/sealedBlob';
import { createTlsStateKeeper } from '../src/tlsState';

const directories: string[] = [];

function createDirectory(): string {
  const directory = mkdtempSync(join(tmpdir(), 'fiducy-tls-'));
  directories.push(directory);
  return directory;
}

async function writeCaddyState(root: string, certificate: string) {
  await mkdir(join(root, 'certificates/acme/gw.example'), { recursive: true });
  await mkdir(join(root, 'acme'), { recursive: true });
  await writeFile(join(root, 'certificates/acme/gw.example/gw.example.crt'), certificate);
  await writeFile(join(root, 'acme/account.json'), '{"kid":"account-1"}');
}

beforeAll(() => createDirectory());
afterAll(() => {
  for (const directory of directories) rmSync(directory, { recursive: true, force: true });
});

describe('sealed blobs', () => {
  const keyWrapper = createLocalKeyWrapper(crypto.getRandomValues(new Uint8Array(32)));

  it('opens what it sealed and nothing else', async () => {
    const plaintext = new TextEncoder().encode('certificate bytes');
    const sealed = await sealBlob(keyWrapper, 'tls-state', plaintext);
    expect(await openBlob(keyWrapper, 'tls-state', sealed)).toEqual(plaintext);
    expect(await openBlob(keyWrapper, 'other-scope', sealed)).toBeNull();
    const tampered = new Uint8Array(sealed);
    tampered[tampered.length - 1] = (tampered[tampered.length - 1] ?? 0) ^ 0xff;
    expect(await openBlob(keyWrapper, 'tls-state', tampered)).toBeNull();
    expect(await openBlob(keyWrapper, 'tls-state', new Uint8Array([0, 1]))).toBeNull();
  });
});

describe('the TLS state keeper', () => {
  const keyWrapper = createLocalKeyWrapper(crypto.getRandomValues(new Uint8Array(32)));

  it('persists Caddy state once per change and restores it into a fresh enclave', async () => {
    const blobStore = createMemoryBlobStore();
    const first = createDirectory();
    const keeper = createTlsStateKeeper({ directory: first, blobStore, keyWrapper });

    expect(await keeper.restore()).toBe(false);
    expect(await keeper.persist()).toBe(false);
    await writeCaddyState(first, 'CERT-1');
    expect(await keeper.persist()).toBe(true);
    expect(await keeper.persist()).toBe(false);
    await writeFile(join(first, 'certificates/acme/gw.example/gw.example.crt'), 'CERT-2');
    expect(await keeper.persist()).toBe(true);

    const second = createDirectory();
    const restoredKeeper = createTlsStateKeeper({ directory: second, blobStore, keyWrapper });
    expect(await restoredKeeper.restore()).toBe(true);
    const certificate = join(second, 'certificates/acme/gw.example/gw.example.crt');
    expect(await readFile(certificate, 'utf8')).toBe('CERT-2');
    expect(await readFile(join(second, 'acme/account.json'), 'utf8')).toBe('{"kid":"account-1"}');
    expect(await restoredKeeper.persist()).toBe(false);
  });

  it('refuses to start when the stored state was sealed for another key', async () => {
    const blobStore = createMemoryBlobStore();
    const directory = createDirectory();
    await writeCaddyState(directory, 'CERT-1');
    await createTlsStateKeeper({ directory, blobStore, keyWrapper }).persist();
    expect(await blobStore.readBlob(TLS_STATE_BLOB_NAME)).not.toBeNull();

    const otherWrapper = createLocalKeyWrapper(crypto.getRandomValues(new Uint8Array(32)));
    const target = createDirectory();
    const keeper = createTlsStateKeeper({ directory: target, blobStore, keyWrapper: otherWrapper });
    await expect(keeper.restore()).rejects.toThrow('could not be opened');
    expect(await readdir(target)).toEqual([]);
  });
});

describe('reporting the ACME account for CAA', () => {
  const accountPath = 'acme/acme-v02.api.letsencrypt.org-directory/users/default/default.json';
  const accountURL = 'https://acme-v02.api.letsencrypt.org/acme/acct/2794013655';
  const encode = (text: string) => Buffer.from(text).toString('base64');

  it('finds the account URL Caddy stored after registering', () => {
    const snapshot = {
      [accountPath]: encode(JSON.stringify({ status: 'valid', location: accountURL })),
      'acme/acme-v02.api.letsencrypt.org-directory/users/default/default.key': encode('key'),
      'certificates/acme-v02.api.letsencrypt.org-directory/gw.example/gw.example.json': encode(
        JSON.stringify({ location: 'https://elsewhere.example/acct/1' })
      )
    };
    expect(findACMEAccountURLs(snapshot)).toEqual([accountURL]);
  });

  it('ignores account files without an https location or with broken JSON', () => {
    const snapshot = {
      [accountPath]: encode('{"status":"valid"}'),
      'acme/other/users/default/default.json': encode('not json'),
      'acme/plain/users/default/default.json': encode('{"location":"http://insecure/acct/1"}')
    };
    expect(findACMEAccountURLs(snapshot)).toEqual([]);
  });

  it('logs each account once while the state keeps being persisted', async () => {
    const directory = createDirectory();
    const blobStore = createMemoryBlobStore();
    const keyWrapper = createLocalKeyWrapper(crypto.getRandomValues(new Uint8Array(32)));
    const keeper = createTlsStateKeeper({ directory, blobStore, keyWrapper });
    await mkdir(join(directory, 'acme/acme-v02.api.letsencrypt.org-directory/users/default'), {
      recursive: true
    });
    await writeFile(join(directory, accountPath), JSON.stringify({ location: accountURL }));
    const log = spyOn(console, 'log').mockImplementation(() => {});
    await keeper.persist();
    await writeFile(join(directory, 'certificates.txt'), 'renewed');
    await keeper.persist();
    const accountLines = log.mock.calls.filter(([line]) => line === `ACME account for the CAA accounturi: ${accountURL}`);
    log.mockRestore();
    expect(accountLines).toHaveLength(1);
  });

  it('logs the account when a fresh enclave restores the sealed state', async () => {
    const blobStore = createMemoryBlobStore();
    const keyWrapper = createLocalKeyWrapper(crypto.getRandomValues(new Uint8Array(32)));
    const source = createDirectory();
    await mkdir(join(source, 'acme/acme-v02.api.letsencrypt.org-directory/users/default'), {
      recursive: true
    });
    await writeFile(join(source, accountPath), JSON.stringify({ location: accountURL }));
    await createTlsStateKeeper({ directory: source, blobStore, keyWrapper }).persist();
    const log = spyOn(console, 'log').mockImplementation(() => {});
    const restored = createTlsStateKeeper({ directory: createDirectory(), blobStore, keyWrapper });
    await restored.restore();
    const accountLines = log.mock.calls.filter(([line]) => line === `ACME account for the CAA accounturi: ${accountURL}`);
    log.mockRestore();
    expect(accountLines).toHaveLength(1);
  });
});
