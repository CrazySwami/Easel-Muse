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

// Dev-only render logging wrapper (env-gated)
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
  try {
    const enabled = String(process.env.NEXT_PUBLIC_ENABLE_RENDER_DIAGS || '').toLowerCase() === '1';
    if (enabled) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { withRenderLog } = require('@/lib/debug/render-log');
      for (const key of Object.keys(nodeTypes)) {
        const Comp = (nodeTypes as any)[key];
        if (typeof Comp === 'function' && !(Comp as any).__wrappedWithRenderLog) {
          const Wrapped = withRenderLog(Comp, `Node:${key}`);
          (Wrapped as any).__wrappedWithRenderLog = true;
          (nodeTypes as any)[key] = Wrapped;
        }
      }
    }
  } catch {}
}
