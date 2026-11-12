import { PUBLIC_ENVIRONMENT_PREFIXES } from '../constants.ts';
import { findEnvironmentFile } from '../environment.ts';

export function describeExposedSecret(root: string): string | null {
  for (const prefix of PUBLIC_ENVIRONMENT_PREFIXES) {
    const name = `${prefix}FIDUCY_APP_SECRET`;
    const file = findEnvironmentFile(root, name);
    if (file) {
      return `${name} in ${file} is a public env var, so your bundler ships the app secret to the browser. Rename it to FIDUCY_APP_SECRET, rotate the secret if that build was ever deployed, then run fiducy dev again.`;
    }
  }
  return null;
}
