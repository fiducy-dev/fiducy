export type ProviderName = 'openai' | 'anthropic' | 'gemini' | 'openrouter';

export interface ProviderConfiguration {
  name: ProviderName;
  baseURL: string;
  allowedPathPrefix: string;
  authorizationHeader: string;
  formatAuthorization: (apiKey: string) => string;
  defaultHeaders: Record<string, string>;
}

export type ProviderRegistry = Record<ProviderName, ProviderConfiguration>;

export interface UpstreamRequestInput {
  provider: ProviderConfiguration;
  path: string;
  method: string;
  headers: Headers;
  body: string | Request['body'];
  apiKey: string;
}

export type UpstreamRequestError = 'path_not_allowed';

export type StreamingRequestInit = RequestInit & { duplex: 'half' };

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface RelayResponseInput {
  upstreamResponse: Response;
  apiKey: string;
  onUsage: (usage: TokenUsage, outcome: UsageOutcome) => void;
}

export type UsageOutcome = 'complete' | 'interrupted';

export interface ModelPrice {
  modelPrefix: string;
  inputDollarsPerMillionTokens: number;
  outputDollarsPerMillionTokens: number;
}

export type OutputLimitStyle = 'top-level' | 'gemini' | 'none';

export interface MeteredEndpoint {
  provider: ProviderName;
  pathPattern: RegExp;
  outputLimitStyle: OutputLimitStyle;
  outputLimitField: string;
  clampedFields: string[];
  requestsStreamUsage: boolean;
}

export interface MeteredRequest {
  body: string;
  model: string;
  estimatedInputTokens: number;
  outputTokenCeiling: number;
  responseCount: number;
}

export interface MeterRequestInput {
  provider: ProviderName;
  path: string;
  body: string;
  maximumOutputTokens: number;
}

export type MeterRequestError = 'endpoint_not_metered' | 'invalid_body';

export type JSONObject = Record<string, unknown>;
