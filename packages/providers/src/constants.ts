import { GATEWAY_ERROR_HEADER } from '@fiducy/core';

import type { MeteredEndpoint } from './types.ts';

export const STRIPPED_REQUEST_HEADERS = [
  'authorization',
  'x-api-key',
  'x-goog-api-key',
  'x-key-handle',
  'cookie',
  'host',
  'content-length',
  'connection',
  'keep-alive',
  'transfer-encoding',
  'upgrade',
  'te',
  'trailer',
  'proxy-authorization',
  'proxy-connection',
  'accept-encoding',
  'forwarded',
  'x-forwarded-for',
  'x-forwarded-host',
  'x-forwarded-proto',
  'x-real-ip'
];

export const STRIPPED_RESPONSE_HEADERS = [
  GATEWAY_ERROR_HEADER,
  'set-cookie',
  'connection',
  'keep-alive',
  'transfer-encoding',
  'content-encoding',
  'content-length'
];

export const SECRET_PATTERN = /(sk-[A-Za-z0-9_*.-]{4,}|AIza[A-Za-z0-9_-]{8,})/g;
export const REDACTED_TEXT = '[redacted]';
export const EVENT_STREAM_TYPE = 'text/event-stream';
export const CHARACTERS_PER_ESTIMATED_TOKEN = 4;
export const MAXIMUM_ESTIMATED_INPUT_TOKENS = 128000;
export const GEMINI_MODEL_PATTERN = /^\/v1beta\/models\/([^/:]+):/;

export const METERED_ENDPOINTS: MeteredEndpoint[] = [
  {
    provider: 'openai',
    pathPattern: /^\/v1\/chat\/completions$/,
    outputLimitStyle: 'top-level',
    outputLimitField: 'max_completion_tokens',
    clampedFields: ['max_completion_tokens', 'max_tokens'],
    requestsStreamUsage: true
  },
  {
    provider: 'openai',
    pathPattern: /^\/v1\/responses$/,
    outputLimitStyle: 'top-level',
    outputLimitField: 'max_output_tokens',
    clampedFields: ['max_output_tokens'],
    requestsStreamUsage: false
  },
  {
    provider: 'openai',
    pathPattern: /^\/v1\/completions$/,
    outputLimitStyle: 'top-level',
    outputLimitField: 'max_tokens',
    clampedFields: ['max_tokens'],
    requestsStreamUsage: true
  },
  {
    provider: 'openai',
    pathPattern: /^\/v1\/embeddings$/,
    outputLimitStyle: 'none',
    outputLimitField: '',
    clampedFields: [],
    requestsStreamUsage: false
  },
  {
    provider: 'anthropic',
    pathPattern: /^\/v1\/messages$/,
    outputLimitStyle: 'top-level',
    outputLimitField: 'max_tokens',
    clampedFields: ['max_tokens'],
    requestsStreamUsage: false
  },
  {
    provider: 'anthropic',
    pathPattern: /^\/v1\/messages\/count_tokens$/,
    outputLimitStyle: 'none',
    outputLimitField: '',
    clampedFields: [],
    requestsStreamUsage: false
  },
  {
    provider: 'gemini',
    pathPattern: /^\/v1beta\/models\/[^/:]+:(generateContent|streamGenerateContent)$/,
    outputLimitStyle: 'gemini',
    outputLimitField: 'maxOutputTokens',
    clampedFields: ['maxOutputTokens'],
    requestsStreamUsage: false
  },
  {
    provider: 'gemini',
    pathPattern: /^\/v1beta\/models\/[^/:]+:(countTokens|embedContent|batchEmbedContents)$/,
    outputLimitStyle: 'none',
    outputLimitField: '',
    clampedFields: [],
    requestsStreamUsage: false
  },
  {
    provider: 'openrouter',
    pathPattern: /^\/api\/v1\/(chat\/)?completions$/,
    outputLimitStyle: 'top-level',
    outputLimitField: 'max_tokens',
    clampedFields: ['max_tokens', 'max_completion_tokens'],
    requestsStreamUsage: false
  }
];
