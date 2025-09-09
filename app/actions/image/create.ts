'use server';

import { getSubscribedUser } from '@/lib/auth';
import { database } from '@/lib/database';
import { parseError } from '@/lib/error/parse';
import { imageModels } from '@/lib/models/image';
import { visionModels } from '@/lib/models/vision';
import { trackCreditUsage } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';
import { projects } from '@/schema';
import type { Edge, Node, Viewport } from '@xyflow/react';
import {
  type Experimental_GenerateImageResult,
  experimental_generateImage as generateImage,
  generateText,
} from 'ai';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import OpenAI from 'openai';

type GenerateImageActionProps = {
  prompt: string;
  nodeId: string;
  projectId: string;
  modelId: string;
  instructions?: string;
  size?: string;
};

const generateGptImage1Image = async ({
  instructions,
  prompt,
  size,
}: {
  instructions?: string;
  prompt: string;
  size?: string;
}) => {
  const openai = new OpenAI();
  const response = await openai.images.generate({
    model: 'gpt-image-1',
    prompt: [
      'Generate an image based on the following instructions and context.',
      '---',
      'Instructions:',
      instructions ?? 'None.',
      '---',
      'Context:',
      prompt,
    ].join('\n'),
    size: size as never | undefined,
    moderation: 'low',
    quality: 'high',
    output_format: 'png',
  });

  const json = response.data?.at(0)?.b64_json;

  if (!json) {
    throw new Error('No response JSON found');
  }

  if (!response.usage) {
    throw new Error('No usage found');
  }

  const image: Experimental_GenerateImageResult['image'] = {
    base64: json,
    uint8Array: Buffer.from(json, 'base64'),
    mediaType: 'image/png',
  };

  return {
    image,
    usage: {
      textInput: response.usage?.input_tokens_details.text_tokens,
      imageInput: response.usage?.input_tokens_details.image_tokens,
      output: response.usage?.output_tokens,
    },
  };
};

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

export const generateImageAction = async ({
  prompt,
  modelId,
  instructions,
  nodeId,
  projectId,
  size,
}: GenerateImageActionProps): Promise<
  | {
      nodeData: object;
    }
  | {
      error: string;
    }
> => {
  try {
    const client = await createClient();
    const user = await getSubscribedUser();
    const model = imageModels[modelId];

    if (!model) {
      throw new Error('Model not found');
    }

    let image: Experimental_GenerateImageResult['image'] | undefined;

    const provider = model.providers[0];

    if (provider.model.modelId === 'gpt-image-1') {
      const generatedImageResponse = await generateGptImage1Image({
        instructions,
        prompt,
        size,
      });

      await trackCreditUsage({
        action: 'generate_image',
        cost: provider.getCost({
          ...generatedImageResponse.usage,
          size,
        }),
      });

      image = generatedImageResponse.image;
    } else {
      let aspectRatio: `${number}:${number}` | undefined;
      if (size) {
        const [width, height] = size.split('x').map(Number);
        const divisor = gcd(width, height);
        aspectRatio = `${width / divisor}:${height / divisor}`;
      }

      if ((model as any).lmImage) {
        // Gemini 2.5 Flash Image Preview returns images via generateText files
        const result = await generateText({
          model: provider.model as never,
          prompt: [
            'Generate an image based on the following instructions and context.',
            '---',
            'Instructions:',
            instructions ?? 'None.',
            '---',
            'Context:',
            prompt,
          ].join('\n'),
          providerOptions: {
            google: { responseModalities: ['TEXT', 'IMAGE'] },
          },
        });
        // no logs in production

        const file = (result as any).files?.find((f: any) =>
          f.mediaType?.startsWith('image/')
        );

        if (!file) {
          throw new Error('No image returned by Gemini response');
        }

        let uint8Array: Uint8Array | undefined = undefined;
        // Prefer toArrayBuffer()/arrayBuffer() if provided by AI SDK 5 GeneratedFile
        if (typeof (file as any).toArrayBuffer === 'function') {
          const ab = await (file as any).toArrayBuffer();
          uint8Array = new Uint8Array(ab);
          // noop
        } else if (typeof (file as any).arrayBuffer === 'function') {
          const ab = await (file as any).arrayBuffer();
          uint8Array = new Uint8Array(ab);
          // noop
        } else if (file.data && (file.data as any).buffer) {
          // Some runtimes expose a Uint8Array directly
          uint8Array = file.data as Uint8Array;
          // noop
        } else if (file.data instanceof ArrayBuffer) {
          uint8Array = new Uint8Array(file.data as ArrayBuffer);
          // noop
        } else if (typeof Buffer !== 'undefined' && Buffer.isBuffer?.(file.data)) {
          uint8Array = new Uint8Array(file.data as Buffer);
          // noop
        } else if (typeof (file as any).blob === 'function') {
          const blob = await (file as any).blob();
          uint8Array = new Uint8Array(await blob.arrayBuffer());
          // noop
        } else if ((file as any).url) {
          const urlString = (file as any).url as string;
          if (urlString.startsWith('data:')) {
            // data:[mime];base64,<data>
            const comma = urlString.indexOf(',');
            const meta = urlString.substring(5, comma); // e.g. image/png;base64
            const b64 = urlString.substring(comma + 1);
            uint8Array = Buffer.from(b64, 'base64');
            // Normalize mediaType if missing
            if (!file.mediaType && meta) {
              (file as any).mediaType = meta.split(';')[0];
            }
            // noop
          } else {
            // Fallback: fetch from URL
            const res = await fetch(urlString);
            const ab = await res.arrayBuffer();
            uint8Array = new Uint8Array(ab);
            // noop
          }
        } else if ((file as any).inlineData?.data) {
          // Some providers return inline base64
          const b64 = (file as any).inlineData.data as string;
          uint8Array = Buffer.from(b64, 'base64');
          // noop
        } else if ((file as any).uint8ArrayData) {
          // Observed shape in Gateway: { uint8ArrayData, base64Data, mediaType }
          uint8Array = (file as any).uint8ArrayData as Uint8Array;
          // noop
        } else if ((file as any).base64Data) {
          const b64 = (file as any).base64Data as string;
          uint8Array = Buffer.from(b64, 'base64');
          // noop
        }

        if (!uint8Array) {
          throw new Error('Unable to read image bytes from Gemini response');
        }

        image = {
          base64: Buffer.from(uint8Array).toString('base64'),
          uint8Array,
          mediaType: (file.mediaType as string) ?? 'image/png',
        } as Experimental_GenerateImageResult['image'];
        // noop

        await trackCreditUsage({
          action: 'generate_image',
          cost: provider.getCost({ size }),
        });
      } else {
        const generatedImageResponse = await generateImage({
          model: provider.model,
          prompt: [
            'Generate an image based on the following instructions and context.',
            '---',
            'Instructions:',
            instructions ?? 'None.',
            '---',
            'Context:',
            prompt,
          ].join('\n'),
          size: size as never,
          aspectRatio,
          providerOptions: {
            google: {
              responseModalities: ['TEXT', 'IMAGE'],
            },
          },
        });

        await trackCreditUsage({
          action: 'generate_image',
          cost: provider.getCost({
            size,
          }),
        });

        image = generatedImageResponse.image;
      }
    }

    let extension = image.mediaType.split('/').pop();

    if (extension === 'jpeg') {
      extension = 'jpg';
    }

    const name = `${nanoid()}.${extension}`;

    const file: File = new File([image.uint8Array], name, {
      type: image.mediaType,
    });

    const blob = await client.storage
      .from('files')
      .upload(`${user.id}/${name}`, file, {
        contentType: file.type,
      });

    if (blob.error) {
      throw new Error(blob.error.message);
    }

    const { data: downloadUrl } = client.storage
      .from('files')
      .getPublicUrl(blob.data.path);

    const url =
      process.env.NODE_ENV === 'production'
        ? downloadUrl.publicUrl
        : `data:${image.mediaType};base64,${Buffer.from(image.uint8Array).toString('base64')}`;

    const project = await database.query.projects.findFirst({
      where: eq(projects.id, projectId),
    });

    if (!project) {
      throw new Error('Project not found');
    }

    const visionModel = visionModels[project.visionModel];

    if (!visionModel) {
      throw new Error('Vision model not found');
    }

    const openai = new OpenAI();
    const response = await openai.chat.completions.create({
      model: visionModel.providers[0].model.modelId,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Describe this image.' },
            {
              type: 'image_url',
              image_url: {
                url,
              },
            },
          ],
        },
      ],
    });

    const description = response.choices.at(0)?.message.content;

    if (!description) {
      throw new Error('No description found');
    }

    const content = project.content as {
      nodes: Node[];
      edges: Edge[];
      viewport: Viewport;
    };

    const existingNode = content.nodes.find((n) => n.id === nodeId);

    if (!existingNode) {
      throw new Error('Node not found');
    }

    const newData = {
      ...(existingNode.data ?? {}),
      updatedAt: new Date().toISOString(),
      generated: {
        url: downloadUrl.publicUrl,
        type: image.mediaType,
      },
      description,
    };

    const updatedNodes = content.nodes.map((existingNode) => {
      if (existingNode.id === nodeId) {
        return {
          ...existingNode,
          data: newData,
        };
      }

      return existingNode;
    });

    await database
      .update(projects)
      .set({ content: { ...content, nodes: updatedNodes } })
      .where(eq(projects.id, projectId));

    return {
      nodeData: newData,
    };
  } catch (error) {
    const message = parseError(error);

    return { error: message };
  }
};
