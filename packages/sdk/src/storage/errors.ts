const MISSING_TABLE_CODES = new Set(['42P01', 'ER_NO_SUCH_TABLE', 'P2021']);

function isMissingTableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const { code } = error as Error & { code?: unknown };
  if (typeof code === 'string' && MISSING_TABLE_CODES.has(code)) return true;
  if (/no such table/i.test(error.message)) return true;
  return isMissingTableError(error.cause);
}

export function explainMissingTable(tableName: string, howToCreate: string) {
  return (error: unknown): never => {
    if (!isMissingTableError(error)) throw error;
    throw new Error(`The Fiducy table "${tableName}" does not exist yet. ${howToCreate}`, {
      cause: error
    });
  };
}
