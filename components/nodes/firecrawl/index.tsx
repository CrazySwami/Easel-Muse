import { useNodeConnections } from '@xyflow/react';
import dynamic from 'next/dynamic';
import { ErrorBoundary } from '@/components/ui/error-boundary';

const FirecrawlPrimitive = dynamic(() => import('./primitive').then((m) => m.FirecrawlPrimitive), {
  ssr: false,
});
const FirecrawlTransform = dynamic(() => import('./transform').then((m) => m.FirecrawlTransform), {
  ssr: false,
});

export type FirecrawlMode = 'scrape';

export type FirecrawlNodeProps = {
  id: string;
  type: string;
  data: {
    mode?: FirecrawlMode;
    url?: string;
    query?: string;
    formats?: Array<'markdown' | 'html' | 'links' | 'screenshot' | 'metadata' | 'json'>;
    options?: Record<string, unknown>;
    emit?: 'markdown' | 'markdownList' | 'links' | 'json' | 'screenshots';
    status?: 'idle' | 'running' | 'error' | 'completed';
    error?: string;
    updatedAt?: string;
    resizable?: boolean;
    width?: number;
    height?: number;
    generated?: {
      // Scrape
      doc?: {
        markdown?: string;
        html?: string;
        links?: string[];
        screenshots?: string[];
        metadata?: Record<string, unknown>;
        json?: unknown;
      };
      // Convenience emits
      markdown?: string;
      html?: string;
      links?: string[];
      screenshots?: string[];
    };
  };
};

export const FirecrawlNode = (props: FirecrawlNodeProps) => {
  const connections = useNodeConnections({ id: props.id, handleType: 'target' });
  const hasIncomers = connections.length > 0;
  const Component = hasIncomers ? FirecrawlTransform : FirecrawlPrimitive;
  return (
    <ErrorBoundary fallback={<FirecrawlPrimitive {...props} title="Firecrawl" /> }>
      <Component key={hasIncomers ? 'transform' : 'primitive'} {...props} title="Firecrawl" />
    </ErrorBoundary>
  );
};

export default FirecrawlNode;

