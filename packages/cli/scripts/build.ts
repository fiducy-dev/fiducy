import { chmodSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const OUTPUT_DIRECTORY = join(import.meta.dir, '../dist');
const ENTRY_PATH = join(OUTPUT_DIRECTORY, 'index.js');

rmSync(OUTPUT_DIRECTORY, { recursive: true, force: true });
const result = await Bun.build({
  entrypoints: [join(import.meta.dir, '../src/index.ts')],
  outdir: OUTPUT_DIRECTORY,
  target: 'node',
  format: 'esm',
  external: ['jiti'],
  conditions: ['bun']
});
if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}
writeFileSync(ENTRY_PATH, `#!/usr/bin/env node\n${readFileSync(ENTRY_PATH, 'utf8')}`);
chmodSync(ENTRY_PATH, 0o755);
console.log(`CLI written to ${ENTRY_PATH}`);
