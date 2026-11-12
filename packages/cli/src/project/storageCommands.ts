import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { isSingleSchemaFile, readDrizzleSetup } from './drizzleSetup.ts';
import { runFiducy, runLocal } from './runners.ts';

import type { NextCommand, ProjectInfo } from '../types.ts';

export function fiducyMigrate(project: ProjectInfo): NextCommand {
  return { command: runFiducy(project.packageManager, 'migrate'), purpose: 'creates the table' };
}

export function prismaCommands(project: ProjectInfo): NextCommand[] {
  const singleFile = existsSync(join(project.root, 'prisma/schema.prisma'));
  return [
    {
      command: runFiducy(project.packageManager, 'generate'),
      purpose: 'adds the Prisma model',
      followUp: singleFile ? 'paste the model it prints into prisma/schema.prisma' : undefined
    },
    {
      command: runLocal(project.packageManager, 'prisma migrate dev'),
      purpose: 'creates the table'
    }
  ];
}

export function drizzleCommands(project: ProjectInfo): NextCommand[] {
  const { schema, usesMigrations } = readDrizzleSetup(project.root);
  const exportLine =
    schema && isSingleSchemaFile(schema)
      ? `add export * from './fiducy-schema' to ${schema}`
      : undefined;
  const generate = {
    command: runFiducy(project.packageManager, 'generate'),
    purpose: 'writes the Drizzle table',
    followUp: exportLine
  };
  if (!usesMigrations) {
    return [
      generate,
      {
        command: runLocal(project.packageManager, 'drizzle-kit push'),
        purpose: 'creates the table'
      }
    ];
  }
  return [
    generate,
    {
      command: runLocal(project.packageManager, 'drizzle-kit generate'),
      purpose: 'writes the migration'
    },
    { command: runLocal(project.packageManager, 'drizzle-kit migrate'), purpose: 'applies it' }
  ];
}
