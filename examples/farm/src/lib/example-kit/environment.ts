import type { EnvironmentVariables } from '@fiducy/sdk/server';

let exampleEnvironment: EnvironmentVariables = {};

export function useExampleEnvironment(variables: EnvironmentVariables): void {
  exampleEnvironment = variables;
}

export function readExampleSetting(name: string): string | undefined {
  return exampleEnvironment[name] ?? process.env[name];
}
