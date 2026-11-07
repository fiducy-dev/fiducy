import { afterAll, describe, expect, it } from 'bun:test';

import { createProject, removeProjects, run } from './fixtures.ts';

afterAll(removeProjects);

describe('the fiducy command', () => {
  it('lists the commands', async () => {
    const result = await run(createProject({}), ['--help']);
    expect(result.code).toBe(0);
    for (const name of ['init', 'dev', 'generate', 'migrate']) expect(result.text).toContain(name);
  });

  it('rejects unknown commands, including inherited object keys', async () => {
    for (const name of ['deploy', 'constructor', '__proto__', 'toString']) {
      const result = await run(createProject({}), [name]);
      expect(result.code).toBe(1);
      expect(result.text).toContain(`Unknown command ${name}`);
    }
  });

  it('explains bad flags instead of crashing', async () => {
    const result = await run(createProject({}), ['dev', '--port', 'abc']);
    expect(result.code).toBe(1);
    expect(result.text).toContain('--port abc is not a port');
    const unknown = await run(createProject({}), ['init', '--force']);
    expect(unknown.code).toBe(1);
    expect(unknown.text).toContain("Unknown option '--force'");
  });

  it('asks for a package.json before init', async () => {
    const result = await run(createProject({}), ['init', '--dry-run']);
    expect(result.code).toBe(1);
    expect(result.text).toContain('No package.json here');
  });
});
