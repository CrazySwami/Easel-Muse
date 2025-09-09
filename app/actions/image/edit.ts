'use server';

import { getSubscribedUser } from '@/lib/auth';
import { database } from '@/lib/database';
import { parseError } from '@/lib/error/parse';
import { imageModels } from '@/lib/models/image';
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
import OpenAI, { toFile } from 'openai';

type EditImageActionProps = {
  images: {
    url: string;
    type: string;
  }[];
  modelId: string;
  instructions?: string;
  nodeId: string;
  projectId: string;
  size?: string;
};

const generateGptImage1Image = async ({
  prompt,
  size,
  images,
}: {
  prompt: string;
  size?: string;
  images: {
    url: string;
    type: string;
  }[];
}) => {
  const openai = new OpenAI();
  const promptImages = await Promise.all(
    images.map(async (image) => {
      const response = await fetch(image.url);
      const blob = await response.blob();

      return toFile(blob, nanoid(), {
        type: image.type,
      });
    })
  );

  const response = await openai.images.edit({
    model: 'gpt-image-1',
    image: promptImages,
    prompt,
    size: size as never | undefined,
    quality: 'high',
  });

  const json = response.data?.at(0)?.b64_json;

  if (!json) {
    throw new Error('No response JSON found');
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

export const editImageAction = async ({
  images,
  instructions,
  modelId,
  nodeId,
  projectId,
  size,
}: EditImageActionProps): Promise<
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

    if (!model.supportsEdit) {
      throw new Error('Model does not support editing');
    }

    const provider = model.providers[0];

    let image: Experimental_GenerateImageResult['image'] | undefined;

    const defaultPrompt =
      images.length > 1
        ? 'Create a variant of the image.'
        : 'Create a single variant of the images.';

    const prompt =
      !instructions || instructions === '' ? defaultPrompt : instructions;

    if ((model as any).lmImage) {
      // Gemini image-edit flow via LM files
      const inputRes = await fetch(images[0].url);
      const inputAb = await inputRes.arrayBuffer();
      const inputBytes = new Uint8Array(inputAb);
      const inputType = images[0].type;

      const result = await generateText({
        model: provider.model as never,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'file', data: inputBytes, mediaType: inputType },
            ],
          },
        ],
        providerOptions: {
          google: { responseModalities: ['TEXT', 'IMAGE'] },
        },
      });

      const file = (result as any).files?.find((f: any) =>
        f.mediaType?.startsWith('image/')
      );

      if (!file) {
        throw new Error('No image returned by Gemini');
      }

      let uint8Array: Uint8Array | undefined;
      if (typeof (file as any).toArrayBuffer === 'function') {
        const ab = await (file as any).toArrayBuffer();
        uint8Array = new Uint8Array(ab);
      } else if (typeof (file as any).arrayBuffer === 'function') {
        const ab = await (file as any).arrayBuffer();
        uint8Array = new Uint8Array(ab);
      } else if (file.data && (file.data as any).buffer) {
        uint8Array = file.data as Uint8Array;
      } else if (file.data instanceof ArrayBuffer) {
        uint8Array = new Uint8Array(file.data as ArrayBuffer);
      } else if (typeof Buffer !== 'undefined' && Buffer.isBuffer?.(file.data)) {
        uint8Array = new Uint8Array(file.data as Buffer);
      } else if (typeof (file as any).blob === 'function') {
        const blob = await (file as any).blob();
        uint8Array = new Uint8Array(await blob.arrayBuffer());
      } else if ((file as any).url) {
        const res = await fetch((file as any).url as string);
        const ab = await res.arrayBuffer();
        uint8Array = new Uint8Array(ab);
      } else if ((file as any).inlineData?.data) {
        const b64 = (file as any).inlineData.data as string;
        uint8Array = Buffer.from(b64, 'base64');
      } else if ((file as any).uint8ArrayData) {
        uint8Array = (file as any).uint8ArrayData as Uint8Array;
      } else if ((file as any).base64Data) {
        const b64 = (file as any).base64Data as string;
        uint8Array = Buffer.from(b64, 'base64');
      }

      if (!uint8Array) {
        throw new Error('Unable to read image bytes from Gemini response');
      }

      image = {
        base64: Buffer.from(uint8Array).toString('base64'),
        uint8Array,
        mediaType: (file.mediaType as string) ?? inputType ?? 'image/png',
      } as Experimental_GenerateImageResult['image'];

      await trackCreditUsage({
        action: 'generate_image',
        cost: provider.getCost({
          size,
        }),
      });
    } else if (provider.model.modelId === 'gpt-image-1') {
      const generatedImageResponse = await generateGptImage1Image({
        prompt,
        images,
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
      const base64Image = await fetch(images[0].url)
        .then((res) => res.arrayBuffer())
        .then((buffer) => Buffer.from(buffer).toString('base64'));

      const generatedImageResponse = await generateImage({
        model: provider.model,
        prompt,
        size: size as never,
        providerOptions: {
          bfl: {
            image: base64Image,
          },
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

    const bytes = Buffer.from(image.base64, 'base64');
    const contentType = 'image/png';

    const blob = await client.storage
      .from('files')
      .upload(`${user.id}/${nanoid()}`, bytes, {
        contentType,
      });

    if (blob.error) {
      throw new Error(blob.error.message);
    }

    const { data: downloadUrl } = client.storage
      .from('files')
      .getPublicUrl(blob.data.path);

    const project = await database.query.projects.findFirst({
      where: eq(projects.id, projectId),
    });

    if (!project) {
      throw new Error('Project not found');
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
        type: contentType,
      },
      description: instructions ?? defaultPrompt,
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
