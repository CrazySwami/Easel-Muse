import { useNodeConnections } from '@xyflow/react';
import dynamic from 'next/dynamic';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { PerplexitySearchPrimitive } from './primitive';
import type { PerplexitySearchRequest, PerplexitySearchResult } from '@/lib/clients/perplexity';

const PerplexitySearchTransform = dynamic(() => import('./transform').then((mod) => mod.PerplexitySearchTransform), {
  ssr: false,
});

export type PerplexitySearchNodeData = {
  source: 'primitive' | 'transform';
  query?: PerplexitySearchRequest['query'];
  country?: string;
  max_results?: number;
  max_tokens_per_page?: number;
  resizable?: boolean;
  width?: number;
  height?: number;
  generated?: {
    results:
      | PerplexitySearchResult[]
      | PerplexitySearchResult[][];
  };
  updatedAt?: string;
  instructions?: string;
};

export type PerplexitySearchNodeProps = {
  id: string;
  type: string;
  data: PerplexitySearchNodeData;
};

export const PerplexitySearchNode = (props: PerplexitySearchNodeProps) => {
  const connections = useNodeConnections({
    id: props.id,
    handleType: 'target',
  });
  const hasIncomers = connections.length > 0;
  const Component = hasIncomers ? PerplexitySearchTransform : PerplexitySearchPrimitive;

  return (
    <ErrorBoundary fallback={<PerplexitySearchPrimitive {...props} title="Perplexity Search" /> }>
      <Component key={hasIncomers ? 'transform' : 'primitive'} {...props} title="Perplexity Search" />
    </ErrorBoundary>
  );
};

export default PerplexitySearchNode;
