import { z } from 'zod';

import { MAXIMUM_ALLOWED_ORIGINS, MAXIMUM_MONTHLY_REQUEST_LIMIT } from './constants';
import { MAXIMUM_USAGE_BATCH_SIZE } from './constants';
import { DEFAULT_USAGE_SERIES_DAYS, MAXIMUM_USAGE_SERIES_DAYS } from './constants';
import { MAXIMUM_CONCURRENT_REQUEST_LIMIT, MAXIMUM_DOLLAR_LIMIT } from './constants';
import { MAXIMUM_OUTPUT_TOKEN_LIMIT } from './constants';

function isBareOrigin(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === 'https:' || url.protocol === 'http:') && url.origin === value;
  } catch {
    return false;
  }
}

const originSchema = z
  .string()
  .trim()
  .refine(isBareOrigin, 'Use a bare origin such as https://example.com with no path');

const dollarLimitSchema = z.number().min(0).max(MAXIMUM_DOLLAR_LIMIT).optional();

export const spendLimitsSchema = z.object({
  dailyDollarLimitPerKey: dollarLimitSchema,
  dailyDollarLimitPerApp: dollarLimitSchema,
  minuteDollarLimitPerApp: dollarLimitSchema,
  concurrentRequestLimitPerKey: z
    .number()
    .int()
    .min(1)
    .max(MAXIMUM_CONCURRENT_REQUEST_LIMIT)
    .optional(),
  maximumOutputTokens: z.number().int().min(1).max(MAXIMUM_OUTPUT_TOKEN_LIMIT).optional()
});

export const appSettingsSchema = z.object({
  name: z.string().trim().min(1, 'Give the app a name').max(80),
  monthlyRequestLimitPerKey: z.coerce.number().int().min(1).max(MAXIMUM_MONTHLY_REQUEST_LIMIT),
  allowedOrigins: z.array(originSchema).max(MAXIMUM_ALLOWED_ORIGINS),
  recordStorage: z.enum(['fiducy', 'app']).default('fiducy'),
  allowKeyImport: z.boolean().default(false),
  spendLimits: spendLimitsSchema.optional()
});

export const appSettingsUpdateSchema = appSettingsSchema.omit({ recordStorage: true }).partial();

export const usageEventSchema = z.object({
  appID: z.string().min(1),
  keyID: z.string().min(1),
  provider: z.string().min(1),
  inputTokens: z.number().int().min(0),
  outputTokens: z.number().int().min(0),
  recordedAt: z.string().datetime()
});

export const usageBatchSchema = z.object({
  events: z.array(usageEventSchema).max(MAXIMUM_USAGE_BATCH_SIZE)
});

export const usageSeriesQuerySchema = z.object({
  days: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAXIMUM_USAGE_SERIES_DAYS)
    .default(DEFAULT_USAGE_SERIES_DAYS)
});

export const keyEventSchema = z.object({
  type: z.enum(['saved', 'revoked']),
  appID: z.string().min(1).max(80),
  keyID: z.string().regex(/^[A-Za-z0-9_-]{22}$/, 'Use a 22 character key ID'),
  source: z.enum(['widget', 'import']).optional()
});
