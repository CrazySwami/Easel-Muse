import type { AudioNodeProps } from '@/components/nodes/audio';
import type { CodeNodeProps } from '@/components/nodes/code';
import type { FileNodeProps } from '@/components/nodes/file';
import type { ImageNodeProps } from '@/components/nodes/image';
import type { TextNodeProps } from '@/components/nodes/text';
import type { TweetNodeProps } from '@/components/nodes/tweet';
import type { Node } from '@xyflow/react';
import type { VoiceMemoNodeProps } from '@/components/nodes/voice-memo';
import type { TiptapNodeProps } from '@/components/nodes/tiptap';
import type { FirecrawlNodeProps } from '@/components/nodes/firecrawl';

export const getTextFromTextNodes = (nodes: Node[]) => {
  const sourceTexts = nodes
    .filter((node) => node.type === 'text')
    .map((node) => (node.data as TextNodeProps['data']).text);

  const generatedTexts = nodes
    .filter((node) => node.type === 'text' && node.data.generated)
    .map((node) => (node.data as TextNodeProps['data']).generated?.text);

  return [...sourceTexts, ...generatedTexts].filter(Boolean) as string[];
};

export const getTranscriptionFromAudioNodes = (nodes: Node[]) => {
  const transcripts = nodes
    .filter((node) => node.type === 'audio')
    .map((node) => (node.data as AudioNodeProps['data']).transcript)
    .filter(Boolean) as string[];

  return transcripts;
};

export const getDescriptionsFromImageNodes = (nodes: Node[]) => {
  const descriptions = nodes
    .filter((node) => node.type === 'image')
    .map((node) => (node.data as ImageNodeProps['data']).description)
    .filter(Boolean) as string[];

  return descriptions;
};

export const getImagesFromImageNodes = (nodes: Node[]) => {
  const sourceImages = nodes
    .filter((node) => node.type === 'image')
    .map((node) => (node.data as ImageNodeProps['data']).content)
    .filter(Boolean) as { url: string; type: string }[];

  const generatedImages = nodes
    .filter((node) => node.type === 'image')
    .map((node) => (node.data as ImageNodeProps['data']).generated)
    .filter(Boolean) as { url: string; type: string }[];

  return [...sourceImages, ...generatedImages];
};

export const isValidSourceTarget = (source: Node, target: Node) => {
  if (source.type === 'video' || source.type === 'drop') {
    return false;
  }

  if (target.type === 'audio' && source.type !== 'text') {
    return false;
  }

  if (target.type === 'file') {
    return false;
  }

  return true;
};

export const getCodeFromCodeNodes = (nodes: Node[]) => {
  const sourceCodes = nodes
    .filter((node) => node.type === 'code')
    .map((node) => (node.data as CodeNodeProps['data']).content)
    .filter(Boolean) as { text: string; language: string }[];

  const generatedCodes = nodes
    .filter((node) => node.type === 'code' && node.data.generated)
    .map((node) => (node.data as CodeNodeProps['data']).generated)
    .filter(Boolean) as { text: string; language: string }[];

  return [...sourceCodes, ...generatedCodes];
};

export const getFilesFromFileNodes = (nodes: Node[]) => {
  const files = nodes
    .filter((node) => node.type === 'file')
    .map((node) => (node.data as FileNodeProps['data']).content)
    .filter(Boolean) as { url: string; type: string; name: string }[];

  return files;
};

export const getAudioFromVoiceMemoNodes = (nodes: Node[]) => {
  const audioFiles = nodes
    .filter((node) => node.type === 'voice-memo' && node.data.content)
    .map((node) => {
      const data = node.data as VoiceMemoNodeProps['data'];
      if (data.content?.url) {
        return {
          url: data.content.url,
          type: data.content.type,
        };
      }
      return null;
    })
    .filter(Boolean) as { url: string; type: string }[];
  return audioFiles;
};

export const getTranscriptsFromVoiceMemoNodes = (nodes: Node[]) => {
  const transcripts = nodes
    .filter((node) => node.type === 'voice-memo' && node.data.transcript)
    .map((node) => {
      const data = node.data as VoiceMemoNodeProps['data'];
      return data.transcript;
    })
    .filter(Boolean) as string[];
  return transcripts;
};

export const getTextFromTiptapNodes = (nodes: Node[]) => {
    const contents = nodes
      .filter((node) => node.type === 'tiptap' && node.data.content)
      .map((node) => {
        const data = node.data as TiptapNodeProps['data'];
        // a function to extract text from tiptap content
        const getTextFromContent = (content: any): string => {
            if (!content) return '';
            if (content.text) return content.text;
            if (content.content) {
                return content.content.map(getTextFromContent).join(' ');
            }
            return '';
        }
        return getTextFromContent(data.content);
      })
      .filter(Boolean) as string[];
    return contents;
  };

export const getAudioFromAudioNodes = (nodes: Node[]) => {
  const audioFiles = nodes
    .filter(
      (node) => node.type === 'audio' && node.data.transcript
    )
    .map((node) => {
      const data = node.data as AudioNodeProps['data'];
      if (data.transcript) {
        return {
          url: '', // No direct URL for audio transcript, but could be a placeholder
          type: 'audio/wav', // Assuming a common audio type
        };
      }
      return null;
    })
    .filter(Boolean) as { url: string; type: string }[];
  return audioFiles;
};

export const getTweetContentFromTweetNodes = (nodes: Node[]) => {
  const tweets = nodes
    .filter((node) => node.type === 'tweet')
    .map((node) => (node.data as TweetNodeProps['data']).content)
    .filter(Boolean) as NonNullable<TweetNodeProps['data']['content']>[];

  const tweetContent = tweets.map(
    (tweet) => `On ${tweet.date}, ${tweet.author} tweeted: ${tweet.text}`
  );

  return tweetContent;
};

export const getMarkdownFromFirecrawlNodes = (nodes: Node[]) => {
  const docs = nodes
    .filter((node) => node.type === 'firecrawl')
    .map((node) => (node.data as FirecrawlNodeProps['data']).generated)
    .filter(Boolean);

  const fromDoc = docs
    .map((g) => g?.doc?.markdown)
    .filter(Boolean) as string[];

  return [...fromDoc];
};

export const getLinksFromFirecrawlNodes = (nodes: Node[]) => {
  const docs = nodes
    .filter((node) => node.type === 'firecrawl')
    .map((node) => (node.data as FirecrawlNodeProps['data']).generated)
    .filter(Boolean);

  const fromDoc = docs
    .flatMap((g) => g?.doc?.links ?? [])
    .filter(Boolean) as string[];

  return [...fromDoc];
};
