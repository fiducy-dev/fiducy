import { PUBLIC_ENVIRONMENT_PREFIXES } from '../constants.ts';
import { FiducyConfigurationError } from './errors.ts';

import type { CreateFiducyOptions, EnvironmentHolder, EnvironmentVariables } from './types.ts';
import type { FiducyConnection } from './types.ts';

function readEnvironmentVariable(
  name: string,
  variables: EnvironmentVariables | undefined
): string | undefined {
  const value = (
    variables?.[name] ?? (globalThis as EnvironmentHolder).process?.env?.[name]
  )?.trim();
  return value ? value : undefined;
}

function findExposedSecret(variables: EnvironmentVariables | undefined): string | null {
  const exposedNames = PUBLIC_ENVIRONMENT_PREFIXES.map((prefix) => `${prefix}FIDUCY_APP_SECRET`);
  return (
    exposedNames.find((name) => readEnvironmentVariable(name, variables) !== undefined) ?? null
  );
}

function requireValue(value: string | undefined, name: string, option: string): string {
  if (value) return value;
  throw new FiducyConfigurationError(
    `Fiducy needs ${name}. Set it in your server environment or pass ${option} to createFiducy(). If your framework keeps .env out of process.env (SvelteKit does), pass { env } from its env module.`
  );
}

function requireGatewayURL(value: string): string {
  const parsed = URL.parse(value);
  if (parsed?.protocol === 'http:' || parsed?.protocol === 'https:') return value;
  throw new FiducyConfigurationError(
    `FIDUCY_GATEWAY_URL must be a full http(s) URL such as http://localhost:3438, not "${value}".`
  );
}

export function resolveConnection(options: CreateFiducyOptions): FiducyConnection {
  const variables = options.env;
  const exposedSecret = findExposedSecret(variables);
  if (exposedSecret) {
    throw new FiducyConfigurationError(
      `${exposedSecret} is a public env var, so the app secret ships to the browser. Rename it to FIDUCY_APP_SECRET and rotate the secret in the Fiducy dashboard.`
    );
  }
  const gatewayURL = options.gatewayURL ?? readEnvironmentVariable('FIDUCY_GATEWAY_URL', variables);
  const appSecret = options.appSecret ?? readEnvironmentVariable('FIDUCY_APP_SECRET', variables);
  return {
    gatewayURL: requireGatewayURL(requireValue(gatewayURL, 'FIDUCY_GATEWAY_URL', 'gatewayURL')),
    appSecret: requireValue(appSecret, 'FIDUCY_APP_SECRET', 'appSecret'),
    appID: options.appID ?? readEnvironmentVariable('FIDUCY_APP_ID', variables) ?? null
  };
}

export function requireAppID(connection: FiducyConnection): string {
  return requireValue(connection.appID ?? undefined, 'FIDUCY_APP_ID', 'appID');
}
