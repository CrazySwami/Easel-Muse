'use server';

import { getSubscribedUser } from '@/lib/auth';
import { database } from '@/lib/database';
import { parseError } from '@/lib/error/parse';
import { transcriptionModels } from '@/lib/models/transcription';
import { trackCreditUsage } from '@/lib/stripe';
import { projects } from '@/schema';
import { experimental_transcribe as transcribe } from 'ai';
import { eq } from 'drizzle-orm';

export const transcribeAction = async (
  url: string,
  projectId: string,
  durationSeconds?: number
): Promise<
  | {
      transcript: string;
    }
  | {
      error: string;
    }
> => {
  try {
    await getSubscribedUser();

    const project = await database.query.projects.findFirst({
      where: eq(projects.id, projectId),
    });

    if (!project) {
      throw new Error('Project not found');
    }

    const model = transcriptionModels[project.transcriptionModel];

    if (!model) {
      throw new Error('Model not found');
    }

    const provider = model.providers[0];
    // Always send bytes so providers never need to fetch our URL
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch audio for transcription: ${res.status}`);
    }
    const ab = await res.arrayBuffer();
    const bytes = new Uint8Array(ab);

    let transcript;
    try {
      transcript = await transcribe({ model: provider.model, audio: bytes });
    } catch (err) {
      const msg = String(err instanceof Error ? err.message : err);
      const unsupported = /not support(ed)? the format|unsupported/i.test(msg);
      // Fallback to whisper-1 for broader codec tolerance
      const fallback = transcriptionModels['whisper-1']?.providers[0];
      if (fallback && unsupported) {
        transcript = await transcribe({ model: fallback.model, audio: bytes });
      } else {
        throw err;
      }
    }

    // Track credits if duration is available
    if (typeof durationSeconds === 'number' && !Number.isNaN(durationSeconds)) {
      const cost = provider.getCost(durationSeconds);
      await trackCreditUsage({ action: 'transcribe', cost });
    }

    return {
      transcript: transcript.text,
    };
  } catch (error) {
    const message = parseError(error);

    return { error: message };
  }
};
