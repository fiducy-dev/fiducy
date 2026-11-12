import { OPENAI_RESPONSES_NOTE, PROVIDER_CODE, PROVIDER_PACKAGES } from '../constants.ts';

import type { AIProvider, ProjectInfo, ProviderCode } from '../types.ts';

const PROVIDER_LITERAL_PATTERN = /provider(=|: )(["'])openai\2/g;

export function detectProviders(dependencies: Record<string, string>): AIProvider[] {
  return PROVIDER_PACKAGES.filter(([name]) => dependencies[name]).map(([, provider]) => provider);
}

export function readPrimaryProvider(project: ProjectInfo): AIProvider {
  return project.providers[0] ?? 'openai';
}

export function readProviderCode(provider: AIProvider): ProviderCode {
  return PROVIDER_CODE[provider];
}

export function withProvider(code: string | undefined, provider: AIProvider) {
  return code?.replace(PROVIDER_LITERAL_PATTERN, `provider$1$2${provider}$2`);
}

export function describeModelCall(project: ProjectInfo): string {
  const primary = readPrimaryProvider(project);
  const { factory } = readProviderCode(primary);
  const lines = [
    `Keep the app's model, request variable and API style; only build the provider from ${factory}.`
  ];
  if (primary === 'openai') lines.push(OPENAI_RESPONSES_NOTE);
  for (const other of project.providers.slice(1)) {
    const code = readProviderCode(other);
    lines.push(
      `For ${code.label} calls, do the same with providerSettings('${other}') and ${code.factory}.`
    );
  }
  if (project.providers.includes('openai') && primary !== 'openai')
    lines.push(OPENAI_RESPONSES_NOTE);
  return lines.join(' ');
}

export function describeProviderKeys(project: ProjectInfo): string {
  const names = (project.providers.length > 0 ? project.providers : ['openai' as const]).map(
    (provider) => readProviderCode(provider).apiKeyName
  );
  return names.join(', ');
}
