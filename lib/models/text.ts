import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { openai } from '@ai-sdk/openai';
import type { LanguageModel } from 'ai';
import { perplexity } from '@ai-sdk/perplexity';
import { type TersaModel, type TersaProvider, providers } from '../providers';

const million = 1000000;

type TersaTextModel = TersaModel & {
  providers: (TersaProvider & {
    model: LanguageModel;
    getCost: (
      promptTokens: number,
      completionTokens: number,
    ) => number;
  })[];
};

export const textModels: Record<string, TersaTextModel> = {
  'gpt-4o-mini': {
    label: 'GPT-4o Mini',
    chef: providers.openai,
    providers: [
      {
        ...providers.openai,
        model: openai('gpt-4o-mini'),
        getCost: (promptTokens: number, completionTokens: number) =>
          (promptTokens / million) * 0.15 +
          (completionTokens / million) * 0.6,
      },
    ],
    default: true,
  },
  'gpt-4o': {
    label: 'GPT-4o',
    chef: providers.openai,
    providers: [
      {
        ...providers.openai,
        model: openai('gpt-4o'),
        getCost: (promptTokens: number, completionTokens: number) =>
          (promptTokens / million) * 5 + (completionTokens / million) * 15,
      },
    ],
  },
  'claude-3-5-sonnet': {
    label: 'Claude 3.5 Sonnet',
    chef: providers.anthropic,
    providers: [
      {
        ...providers.anthropic,
        model: anthropic('claude-3-5-sonnet-20240620'),
        getCost: (promptTokens: number, completionTokens: number) =>
          (promptTokens / million) * 3 + (completionTokens / million) * 15,
      },
    ],
  },
  'gemini-1.5-flash': {
    label: 'Gemini 1.5 Flash',
    chef: providers.google,
    providers: [
      {
        ...providers.google,
        model: google('gemini-1.5-flash-latest'),
        getCost: (promptTokens: number, completionTokens: number) =>
          (promptTokens / million) * 0.35 +
          (completionTokens / million) * 1.05,
      },
    ],
  },
    'sonar-small-online': {
    label: 'Sonar Small',
    chef: providers.perplexity,
    providers: [
      {
        ...providers.perplexity,
        model: perplexity('sonar-small-online'),
        getCost: (promptTokens: number, completionTokens: number) =>
        (promptTokens + completionTokens) / 1000 * 0.0002,
      },
    ],
  },
};
