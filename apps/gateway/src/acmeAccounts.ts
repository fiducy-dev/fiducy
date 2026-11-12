import { ACME_ACCOUNT_PATH_PATTERN } from './constants';

import type { ACMEAccountFile, DirectorySnapshot } from './types';

function readAccountURL(encoded: string): string | null {
  try {
    const account = JSON.parse(Buffer.from(encoded, 'base64').toString()) as ACMEAccountFile;
    return account.location?.startsWith('https://') ? account.location : null;
  } catch {
    return null;
  }
}

export function findACMEAccountURLs(snapshot: DirectorySnapshot): string[] {
  return Object.entries(snapshot)
    .filter(([path]) => ACME_ACCOUNT_PATH_PATTERN.test(path))
    .map(([, encoded]) => readAccountURL(encoded))
    .filter((url): url is string => url !== null);
}

export function createACMEAccountReporter() {
  const reportedURLs = new Set<string>();
  return (snapshot: DirectorySnapshot) => {
    for (const url of findACMEAccountURLs(snapshot)) {
      if (reportedURLs.has(url)) continue;
      reportedURLs.add(url);
      console.log(`ACME account for the CAA accounturi: ${url}`);
    }
  };
}
