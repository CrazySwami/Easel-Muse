import { openai } from '@ai-sdk/openai';
import type { TranscriptionModel } from 'ai';
import { type TersaModel, type TersaProvider, providers } from '../providers';

type TersaTranscriptionModel = TersaModel & {
  providers: (TersaProvider & {
    model: TranscriptionModel;
    getCost: (durationSeconds: number) => number; // USD per op based on duration
  })[];
};

export const transcriptionModels: Record<string, TersaTranscriptionModel> = {
  'gpt-4o-mini-transcribe': {
    label: 'GPT-4o Mini Transcribe',
    chef: providers.openai,
    providers: [
      {
        ...providers.openai,
        model: openai.transcription('gpt-4o-mini-transcribe'),
        // $0.006 per minute
        getCost: (durationSeconds: number) => (durationSeconds / 60) * 0.006,
      },
    ],
    default: true,
  },
  'whisper-1': {
    label: 'Whisper 1',
    chef: providers.openai,
    providers: [
      {
        ...providers.openai,
        model: openai.transcription('whisper-1'),
        // $0.006 per minute
        getCost: (durationSeconds: number) => (durationSeconds / 60) * 0.006,
      },
    ],
  },
  'gpt-4o-transcribe': {
    label: 'GPT-4o Transcribe',
    chef: providers.openai,
    providers: [
      {
        ...providers.openai,
        model: openai.transcription('gpt-4o-transcribe'),
        // $0.010 per minute
        getCost: (durationSeconds: number) => (durationSeconds / 60) * 0.01,
      },
    ],
  },
};
