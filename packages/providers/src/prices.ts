import type { ModelPrice } from './types.ts';

function priceModel(modelPrefix: string, input: number, output: number): ModelPrice {
  return {
    modelPrefix,
    inputDollarsPerMillionTokens: input,
    outputDollarsPerMillionTokens: output
  };
}

export const MODEL_PRICES: ModelPrice[] = [
  priceModel('gpt-4o-mini', 0.15, 0.6),
  priceModel('gpt-4o', 2.5, 10),
  priceModel('gpt-4.1-nano', 0.1, 0.4),
  priceModel('gpt-4.1-mini', 0.4, 1.6),
  priceModel('gpt-4.1', 2, 8),
  priceModel('gpt-5-nano', 0.05, 0.4),
  priceModel('gpt-5-mini', 0.25, 2),
  priceModel('gpt-5', 1.25, 10),
  priceModel('o4-mini', 1.1, 4.4),
  priceModel('o3-mini', 1.1, 4.4),
  priceModel('o3', 2, 8),
  priceModel('text-embedding-3-small', 0.02, 0),
  priceModel('text-embedding-3-large', 0.13, 0),
  priceModel('claude-3-5-haiku', 0.8, 4),
  priceModel('claude-haiku-4', 1, 5),
  priceModel('claude-3-7-sonnet', 3, 15),
  priceModel('claude-sonnet-4', 3, 15),
  priceModel('claude-opus-4-5', 5, 25),
  priceModel('claude-opus-4', 15, 75),
  priceModel('gemini-2.0-flash', 0.1, 0.4),
  priceModel('gemini-2.5-flash-lite', 0.1, 0.4),
  priceModel('gemini-2.5-flash', 0.3, 2.5),
  priceModel('gemini-2.5-pro', 2.5, 15)
];
