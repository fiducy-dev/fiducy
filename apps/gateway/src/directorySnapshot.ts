import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';

import type { Bytes } from '@fiducy/core';
import type { DirectorySnapshot } from './types';

async function listFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { recursive: true, withFileTypes: true }).catch(() => []);
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => relative(root, join(entry.parentPath, entry.name)))
    .sort();
}

export async function snapshotDirectory(root: string): Promise<DirectorySnapshot> {
  const snapshot: DirectorySnapshot = {};
  for (const path of await listFiles(root)) {
    snapshot[path] = (await readFile(join(root, path))).toString('base64');
  }
  return snapshot;
}

export async function restoreDirectory(root: string, snapshot: DirectorySnapshot): Promise<void> {
  for (const [path, encoded] of Object.entries(snapshot)) {
    const target = join(root, path);
    await mkdir(dirname(target), { recursive: true, mode: 0o700 });
    await writeFile(target, Buffer.from(encoded, 'base64'), { mode: 0o600 });
  }
}

export function encodeSnapshot(snapshot: DirectorySnapshot): Bytes {
  return new TextEncoder().encode(JSON.stringify(snapshot));
}

export function decodeSnapshot(bytes: Bytes): DirectorySnapshot | null {
  try {
    const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    const entries = Object.entries(parsed);
    if (entries.some(([, value]) => typeof value !== 'string')) return null;
    return Object.fromEntries(entries) as DirectorySnapshot;
  } catch {
    return null;
  }
}

export async function fingerprintSnapshot(snapshot: DirectorySnapshot): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encodeSnapshot(snapshot));
  return Buffer.from(digest).toString('hex');
}
