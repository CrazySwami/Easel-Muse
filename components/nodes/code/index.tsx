import { useNodeConnections } from '@xyflow/react';
import { CodePrimitive } from './primitive';
import { CodeTransform } from './transform';

export type CodeNodeProps = {
  type: string;
  data: {
    generated?: {
      text?: string;
      language?: string;
    };
    model?: string;
    updatedAt?: string;
    instructions?: string;
    content?: {
      text?: string;
      language?: string;
    };
    // Local UI toggle: when true and not connected, show generate UI
    generateMode?: boolean;
  };
  id: string;
};

export const CodeNode = (props: CodeNodeProps) => {
  const connections = useNodeConnections({
    id: props.id,
    handleType: 'target',
  });
  const hasIncomers = connections.length > 0;
  const Component = hasIncomers || props.data.generateMode ? CodeTransform : CodePrimitive;
  return <Component key={(hasIncomers || props.data.generateMode) ? 'transform' : 'primitive'} {...props} title="Code" />;
};
