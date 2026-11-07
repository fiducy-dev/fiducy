import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';

import { DEFAULT_MODEL_ID, DEMO_MODELS } from './constants';

import type { ConnectedKeySettings } from '@fiducy/sdk/server';
import type { LanguageModel } from 'ai';
import type { DemoModel } from './types';

export function findDemoModel(modelID: string | undefined): DemoModel {
  return (
    DEMO_MODELS.find((model) => model.id === modelID) ??
    DEMO_MODELS.find((model) => model.id === DEFAULT_MODEL_ID) ??
    (DEMO_MODELS[0] as DemoModel)
  );
}

// Fiducy settings are a base URL, the app secret and the key handle header, so every
// AI SDK provider factory takes them as they are.
export function createLanguageModel(
  model: DemoModel,
  settings: ConnectedKeySettings
): LanguageModel {
  if (model.provider === 'anthropic') return createAnthropic(settings)(model.id);
  if (model.provider === 'gemini') return createGoogleGenerativeAI(settings)(model.id);
  return createOpenAI(settings).chat(model.id);
}
