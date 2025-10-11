import { AudioNode } from './audio';
import { CodeNode } from './code';
import { DropNode } from './drop';
import { FileNode } from './file';
import { ImageNode } from './image';
import { TextNode } from './text';
import { TweetNode } from './tweet';
import { VideoNode } from './video';
import { VoiceMemoNode } from './voice-memo';
import { FirecrawlNode } from './firecrawl';
import { CustomNode } from './custom';
import { WebRendererNode } from './web-renderer';
import { PerplexityNode } from './perplexity';
import { FullscreenDemoNode } from './test-fullscreen';

export const nodeTypes = {
  image: ImageNode,
  text: TextNode,
  drop: DropNode,
  video: VideoNode,
  audio: AudioNode,
  code: CodeNode,
  file: FileNode,
  tweet: TweetNode,
  'voice-memo': VoiceMemoNode,
  firecrawl: FirecrawlNode,
  custom: CustomNode,
  'web-renderer': WebRendererNode,
  perplexity: PerplexityNode,
  'fullscreen-demo': FullscreenDemoNode,
};
