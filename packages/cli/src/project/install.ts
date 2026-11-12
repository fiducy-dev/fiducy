import { spawn } from 'node:child_process';

import type { InstallResult, PackageManager } from '../types.ts';

const ADD_COMMANDS: Record<PackageManager, string[]> = {
  bun: ['bun', 'add'],
  pnpm: ['pnpm', 'add'],
  yarn: ['yarn', 'add'],
  npm: ['npm', 'install']
};

export function describeInstall(manager: PackageManager, packages: string[]): string {
  return [...ADD_COMMANDS[manager], ...packages].join(' ');
}

export function installPackages(
  root: string,
  manager: PackageManager,
  packages: string[]
): Promise<InstallResult> {
  const [command, ...prefix] = ADD_COMMANDS[manager];
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    const child = spawn(command ?? 'npm', [...prefix, ...packages], {
      cwd: root,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: process.platform === 'win32'
    });
    child.stdout.on('data', (chunk: Buffer) => chunks.push(chunk));
    child.stderr.on('data', (chunk: Buffer) => chunks.push(chunk));
    child.on('error', (error) => resolve({ ok: false, log: error.message }));
    child.on('close', (code) => resolve({ ok: code === 0, log: Buffer.concat(chunks).toString() }));
  });
}
