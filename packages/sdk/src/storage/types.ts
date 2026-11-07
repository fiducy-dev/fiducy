export type SQLDialect = 'sqlite' | 'postgres' | 'mysql';

export type StorageAdapterName = 'kysely' | 'drizzle' | 'prisma';

export type SchemaLanguage = 'sql' | 'typescript' | 'prisma';

export interface GenerateSchemaOptions {
  adapter: StorageAdapterName;
  dialect: SQLDialect;
  tableName?: string;
}

export interface GeneratedSchemaFile {
  language: SchemaLanguage;
  suggestedPath: string;
  contents: string;
}

export interface Migrations {
  toBeCreated: string[];
  compileMigrations: () => Promise<string>;
  runMigrations: () => Promise<void>;
}

export interface StorageSchema {
  adapter: StorageAdapterName;
  dialect: SQLDialect;
  tableName: string;
  generate: () => GeneratedSchemaFile;
  getMigrations?: () => Promise<Migrations>;
}

export interface UserKeyRow {
  user_id: string;
  key_id: string;
  provider: string;
  handle: string;
  record: string | null;
  source: string | null;
  created_at: string;
}

export interface UserKeyModel {
  userID: string;
  keyID: string;
  provider: string;
  handle: string;
  record: string | null;
  source: string | null;
  createdAt: string;
}
