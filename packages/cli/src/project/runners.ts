import { CLI_VERSION } from '../constants.ts';

import type { PackageManager } from '../types.ts';

const DOWNLOAD_RUNNERS: Record<PackageManager, string> = {
  npm: 'npx',
  bun: 'bunx',
  pnpm: 'pnpm dlx',
  yarn: 'yarn dlx'
};

const LOCAL_RUNNERS: Record<PackageManager, string> = {
  npm: 'npx',
  bun: 'bunx',
  pnpm: 'pnpm exec',
  yarn: 'yarn'
};

export function runFiducy(packageManager: PackageManager, subcommand: string): string {
  return `${DOWNLOAD_RUNNERS[packageManager]} fiducy@${CLI_VERSION} ${subcommand}`;
}

export function runLocal(packageManager: PackageManager, command: string): string {
  return `${LOCAL_RUNNERS[packageManager]} ${command}`;
}
