import { spawnSync } from 'node:child_process';

import type { PackageManager } from '../types.ts';

const ADD_COMMANDS: Record<PackageManager, string[]> = {
  bun: ['bun', 'add'],
  pnpm: ['pnpm', 'add'],
  yarn: ['yarn', 'add'],
  npm: ['npm', 'install']
};

export function describeInstall(manager: PackageManager, packages: string[]): string {
  return [...ADD_COMMANDS[manager], ...packages].join(' ');
}

export function installPackages(root: string, manager: PackageManager, packages: string[]) {
  const [command, ...prefix] = ADD_COMMANDS[manager];
  const result = spawnSync(command ?? 'npm', [...prefix, ...packages], {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32'
  });
  return result.status === 0;
}
