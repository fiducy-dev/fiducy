import { createDrizzleSchema } from './drizzleSchema.ts';
import { createPrismaSchema } from './prismaSchema.ts';
import { createTableStatements, resolveTableName } from './sqlSchema.ts';

import type { GenerateSchemaOptions, GeneratedSchemaFile, SQLDialect } from './types.ts';

function generateSQLFile(dialect: SQLDialect, tableName: string): GeneratedSchemaFile {
  const statements = createTableStatements(dialect, tableName);
  return {
    language: 'sql',
    suggestedPath: `fiducy_migrations/create_${tableName}.sql`,
    contents: `${statements.join(';\n\n')};\n`
  };
}

export function generateSchema(options: GenerateSchemaOptions): GeneratedSchemaFile {
  const tableName = resolveTableName(options.tableName);
  if (options.adapter === 'kysely') return generateSQLFile(options.dialect, tableName);
  if (options.adapter === 'prisma') {
    return {
      language: 'prisma',
      suggestedPath: 'prisma/schema/fiducy.prisma',
      contents: createPrismaSchema(options.dialect, tableName)
    };
  }
  return {
    language: 'typescript',
    suggestedPath: 'fiducy-schema.ts',
    contents: createDrizzleSchema(options.dialect, tableName)
  };
}
