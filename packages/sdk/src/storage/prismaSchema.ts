import type { SQLDialect } from './types.ts';

export function readPrismaModelName(tableName: string): string {
  return tableName
    .split('_')
    .filter((part) => part.length > 0)
    .map((part) => `${part[0]?.toUpperCase()}${part.slice(1)}`)
    .join('');
}

export function createPrismaSchema(dialect: SQLDialect, tableName: string): string {
  const recordType = dialect === 'mysql' ? 'String?  @db.Text' : 'String?';
  return `model ${readPrismaModelName(tableName)} {
  userID    String   @map("user_id")
  keyID     String   @map("key_id")
  provider  String
  handle    String
  record    ${recordType}
  source    String?
  createdAt String   @map("created_at")

  @@id([userID, keyID])
  @@index([userID, provider], map: "${tableName}_user_provider_idx")
  @@map("${tableName}")
}
`;
}
