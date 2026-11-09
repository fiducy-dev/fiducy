import {
  appendFileSync,
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync
} from 'node:fs';
import { dirname, join } from 'node:path';

import { PRIVATE_DIRECTORY_MODE, PRIVATE_FILE_MODE, STATE_DIRECTORY } from './constants.ts';

import type { PackageJSON } from './types.ts';

export function readText(path: string): string | null {
  if (!existsSync(path)) return null;
  return readFileSync(path, 'utf8');
}

export function readPackageJSON(root: string): PackageJSON | null {
  const text = readText(join(root, 'package.json'));
  return text === null ? null : (JSON.parse(text) as PackageJSON);
}

export function stripJSONComments(text: string): string {
  let result = '';
  let inString = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1];
    if (inString) {
      result += character;
      if (character === '\\') {
        result += next ?? '';
        index += 1;
      } else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') {
      inString = true;
      result += character;
    } else if (character === '/' && next === '/') {
      while (index < text.length && text[index] !== '\n') index += 1;
      result += '\n';
    } else if (character === '/' && next === '*') {
      index = text.indexOf('*/', index + 2);
      if (index === -1) break;
      index += 1;
    } else result += character;
  }
  return result.replace(/,(\s*[}\]])/g, '$1');
}

export function writeNewFile(path: string, contents: string, mode?: number): boolean {
  if (existsSync(path)) return false;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents, { flag: 'wx', mode });
  return true;
}

export function ensureStateDirectory(root: string): string {
  const directory = join(root, STATE_DIRECTORY);
  mkdirSync(directory, { recursive: true, mode: PRIVATE_DIRECTORY_MODE });
  chmodSync(directory, PRIVATE_DIRECTORY_MODE);
  writeNewFile(join(directory, '.gitignore'), '*\n');
  return directory;
}

export function writePrivateFile(path: string, contents: string) {
  const temporaryPath = `${path}.${process.pid}.tmp`;
  writeFileSync(temporaryPath, contents, { mode: PRIVATE_FILE_MODE });
  renameSync(temporaryPath, path);
}

export function appendLines(path: string, lines: string[], mode: number) {
  const current = readText(path);
  if (current === null) {
    writeFileSync(path, `${lines.join('\n')}\n`, { mode });
    return;
  }
  const separator = current === '' || current.endsWith('\n') ? '' : '\n';
  appendFileSync(path, `${separator}${lines.join('\n')}\n`);
}
