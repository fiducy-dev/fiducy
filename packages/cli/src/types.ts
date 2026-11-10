import type { styleText } from 'node:util';

export type StyleFormat = Parameters<typeof styleText>[0];

export interface Style {
  success: (text: string) => string;
  warning: (text: string) => string;
  failure: (text: string) => string;
  heading: (text: string) => string;
  path: (text: string) => string;
  command: (text: string) => string;
  muted: (text: string) => string;
  accent: (text: string) => string;
  link: (text: string) => string;
  badge: (text: string) => string;
  code: (block: string) => string;
  prose: (text: string) => string;
}

export interface Output {
  info: (message: string) => void;
  error: (message: string) => void;
  status?: (message: string) => void;
  style: Style;
}

export type Ask = (question: string) => Promise<string>;

export interface CommandContext {
  cwd: string;
  output: Output;
  environment: Record<string, string | undefined>;
  ask?: Ask;
}

export type Command = (argv: string[], context: CommandContext) => Promise<number>;

export interface DevState {
  appID: string;
  appSecret: string;
  masterKey: string;
  port: number;
}

export interface DevOptions {
  port?: number;
  origins: string[];
  mock: boolean;
}

export interface EnvironmentSync {
  status: 'current' | 'updated' | 'conflict';
  foreign: string[];
  added: string[];
  replaced: { name: string; file: string }[];
}

export interface DevGateway {
  url: string;
  state: DevState;
  close: () => Promise<void>;
}

export type PackageManager = 'bun' | 'pnpm' | 'yarn' | 'npm';

export type FrameworkName =
  | 'next'
  | 'tanstack-start'
  | 'react-router'
  | 'sveltekit'
  | 'nuxt'
  | 'farmjs'
  | 'express'
  | 'hono'
  | 'node';

export type AuthName = 'better-auth' | 'authjs' | 'clerk' | 'none';

export type StorageName = 'prisma' | 'drizzle' | 'kysely' | 'sqlite';

export type ChatStack = 'assistant-ui' | 'ai-sdk' | 'none';

export type AIProvider = 'openai' | 'anthropic' | 'gemini' | 'openrouter';

export interface ProviderCode {
  label: string;
  factory: string;
  model: string;
  apiKeyName: string;
}

export type WidgetPlacement =
  | { kind: 'chat'; chat: Exclude<ChatStack, 'none'> }
  | { kind: 'settings' }
  | { kind: 'route'; route: string };

export type PlacementChoice = 'chat' | 'settings' | `/${string}`;

export interface ResolvedPlacement {
  placement: WidgetPlacement;
  fellBack: boolean;
}

export interface PackageJSON {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export interface ImportPath {
  specifier: string;
  exportName: string;
}

export interface StorageChoice {
  name: StorageName;
  source?: ImportPath;
  dialect?: string;
}

export interface ProjectInfo {
  root: string;
  packageManager: PackageManager;
  framework: FrameworkName;
  frameworkMajor: number;
  auth: AuthName;
  authSource?: ImportPath;
  storage: StorageChoice;
  chat: ChatStack;
  providers: AIProvider[];
  sourceDirectory: string;
  alias: AliasInfo | null;
  dependencies: Record<string, string>;
}

export interface AliasInfo {
  prefix: string;
  target: string;
}

export interface PlannedFile {
  path: string;
  contents: string;
}

export interface InitPlan {
  placement: WidgetPlacement;
  fiducyCommand: string;
  files: PlannedFile[];
  steps: Snippet[];
  packages: string[];
  warnings: string[];
  commands: NextCommand[];
}

export interface Snippet {
  title: string;
  file: string;
  code?: string;
  detail?: string;
}

export interface NextCommand {
  command: string;
  purpose: string;
  followUp?: string;
}

export interface DrizzleSetup {
  schema: string | null;
  usesMigrations: boolean;
}

export interface PlacementSection {
  steps: Snippet[];
  packages: string[];
}

export interface PlanSection {
  steps: Snippet[];
  warnings: string[];
  commands: NextCommand[];
}

export interface InstallResult {
  ok: boolean;
  log: string;
}

export interface TemplateInput {
  project: ProjectInfo;
  serverModulePath: string;
}

export interface FoundExport {
  file: string;
  exportName: string;
}

export interface GeneratedSchemaFile {
  language: string;
  suggestedPath: string;
  contents: string;
}

export interface Migrations {
  toBeCreated: string[];
  compileMigrations: () => Promise<string>;
  runMigrations: () => Promise<void>;
}

export interface StorageSchema {
  adapter: string;
  dialect: string;
  tableName: string;
  generate: () => GeneratedSchemaFile;
  getMigrations?: () => Promise<Migrations>;
}

export interface LoadedFiducy {
  file: string;
  schema: StorageSchema | null;
}

export interface ParsedFlags {
  values: Record<string, string | boolean | string[] | undefined>;
  positionals: string[];
}
