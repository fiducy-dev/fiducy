import { GATEWAY_ERROR_HEADER } from '@fiducy/core';

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
