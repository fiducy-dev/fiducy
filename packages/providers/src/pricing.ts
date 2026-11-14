import { SNAPSHOT_SUFFIX_PATTERN } from './constants.ts';
import PRICE_TABLE from './prices.json' with { type: 'json' };

import type { ModelPrice, PriceEntry, TokenUsage } from './types.ts';

function normalizeModelName(model: string): string {
  const bareModelName = model.toLowerCase().split('/').at(-1) ?? '';
  return (bareModelName.split(':')[0] ?? '').replaceAll('.', '-');
}

function toModelPrice([model, entry]: [string, PriceEntry]): ModelPrice {
  return {
    model: normalizeModelName(model),
    inputDollarsPerMillionTokens: entry.input,
    outputDollarsPerMillionTokens: entry.output
  };
}

const MODEL_PRICES: ModelPrice[] = Object.entries(PRICE_TABLE as Record<string, PriceEntry>)
  .map(toModelPrice)
  .sort((first, second) => second.model.length - first.model.length);

function matchesPrice(modelName: string, price: ModelPrice): boolean {
  if (!modelName.startsWith(price.model)) return false;
  return SNAPSHOT_SUFFIX_PATTERN.test(modelName.slice(price.model.length));
}

export function findModelPrice(model: string): ModelPrice | null {
  const modelName = normalizeModelName(model);
  if (!modelName) return null;
  return MODEL_PRICES.find((price) => matchesPrice(modelName, price)) ?? null;
}

export function estimateCostInMicrodollars(price: ModelPrice, usage: TokenUsage): number {
  const inputCost = usage.inputTokens * price.inputDollarsPerMillionTokens;
  const outputCost = usage.outputTokens * price.outputDollarsPerMillionTokens;
  return Math.ceil(inputCost + outputCost);
}
