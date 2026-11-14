import { MODEL_PRICES } from './prices.ts';

import type { ModelPrice, TokenUsage } from './types.ts';

function readBareModelName(model: string): string {
  return model.toLowerCase().split('/').at(-1) ?? '';
}

export function findModelPrice(model: string): ModelPrice | null {
  const bareModelName = readBareModelName(model);
  const matches = MODEL_PRICES.filter((price) => bareModelName.startsWith(price.modelPrefix));
  const longestMatch = matches.sort(
    (first, second) => second.modelPrefix.length - first.modelPrefix.length
  )[0];
  return longestMatch ?? null;
}

export function estimateCostInMicrodollars(price: ModelPrice, usage: TokenUsage): number {
  const inputCost = usage.inputTokens * price.inputDollarsPerMillionTokens;
  const outputCost = usage.outputTokens * price.outputDollarsPerMillionTokens;
  return Math.ceil(inputCost + outputCost);
}
