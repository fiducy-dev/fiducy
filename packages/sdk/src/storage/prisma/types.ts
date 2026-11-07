import type { UserKeyModel } from '../types.ts';

export type PrismaProvider = 'postgresql' | 'mysql' | 'sqlite';

export interface PrismaStorageOptions {
  provider: PrismaProvider;
  tableName?: string;
  model?: string;
}

export interface PrismaUserKeyDelegate {
  upsert: (query: {
    where: { userID_keyID: { userID: string; keyID: string } };
    create: UserKeyModel;
    update: Partial<UserKeyModel>;
  }) => Promise<unknown>;
  findFirst: (query: {
    where: Partial<UserKeyModel>;
    orderBy: { createdAt: 'desc' };
  }) => Promise<UserKeyModel | null>;
  findMany: (query: {
    where: Partial<UserKeyModel>;
    orderBy: { createdAt: 'desc' };
  }) => Promise<UserKeyModel[]>;
  deleteMany: (query: { where: Partial<UserKeyModel> }) => Promise<{ count: number }>;
}
