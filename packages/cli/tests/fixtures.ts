import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { runCli } from '../src/cli.ts';
import { createStyle } from '../src/style.ts';

const FIXTURES_DIRECTORY = join(import.meta.dir, '.projects');

export function createProject(files: Record<string, string>): string {
  mkdirSync(FIXTURES_DIRECTORY, { recursive: true });
  const root = mkdtempSync(join(FIXTURES_DIRECTORY, 'project-'));
  for (const [path, contents] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), contents);
  }
  return root;
}

export function removeProjects() {
  rmSync(FIXTURES_DIRECTORY, { recursive: true, force: true });
}

export function packageWith(dependencies: Record<string, string>): string {
  return JSON.stringify({ name: 'existing-app', dependencies });
}

export async function run(root: string, argv: string[], answers?: string[]) {
  const lines: string[] = [];
  const output = {
    info: (line: string) => lines.push(line),
    error: (line: string) => lines.push(line),
    style: createStyle(false)
  };
  const ask = answers
    ? async (question: string) => {
        lines.push(question);
        return answers.shift() ?? '';
      }
    : undefined;
  const code = await runCli(argv, { cwd: root, output, environment: {}, ask });
  return { code, text: lines.join('\n') };
}
