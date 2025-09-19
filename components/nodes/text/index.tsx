import type { JSONContent } from '@tiptap/core';
import { useNodeConnections } from '@xyflow/react';
import dynamic from 'next/dynamic';
import { TextPrimitive } from './primitive';
import { ErrorBoundary } from '@/components/ui/error-boundary';

// Load the heavy transform lazily on the client to avoid dev build layout
// effect cascades when the node switches from primitive → transform.
const TextTransform = dynamic(() => import('./transform').then((m) => m.TextTransform), {
  ssr: false,
});

export type TextNodeProps = {
  type: string;
  data: {
    generated?: {
      text: string;
    };
    model?: string;
    updatedAt?: string;
    instructions?: string;

    // Tiptap generated JSON content
    content?: JSONContent;

    // Tiptap text content
    text?: string;
  };
  id: string;
};

export const TextNode = (props: TextNodeProps) => {
  const connections = useNodeConnections({
    id: props.id,
    handleType: 'target',
  });
  const hasIncomers = connections.length > 0;
  const Component = hasIncomers ? TextTransform : TextPrimitive;
  // Force a clean remount when switching modes
  return (
    <ErrorBoundary fallback={<TextPrimitive {...props} title="Text" /> }>
      <Component key={hasIncomers ? 'transform' : 'primitive'} {...props} title="Text" />
    </ErrorBoundary>
  );
};
