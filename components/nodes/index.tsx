import { AudioNode } from './audio';
import { CodeNode } from './code';
import { DropNode } from './drop';
import { FileNode } from './file';
import { ImageNode } from './image';
import { TextNode } from './text';
import { TweetNode } from './tweet';
import { VideoNode } from './video';
import { FirecrawlNode } from './firecrawl';
import { WebRendererNode } from './web-renderer';
import { PerplexityNode } from './perplexity';
import { AICompareNode } from './ai-compare';
import { SerpApiNode } from './serpapi';
import { ChatNode } from './chat';

export const nodeTypes = {
  image: ImageNode,
  text: TextNode,
  drop: DropNode,
  video: VideoNode,
  audio: AudioNode,
  code: CodeNode,
  file: FileNode,
  tweet: TweetNode,
  firecrawl: FirecrawlNode,
  'web-renderer': WebRendererNode,
  perplexity: PerplexityNode,
  serpapi: SerpApiNode,
  chat: ChatNode,
  'ai-compare': AICompareNode,
};
