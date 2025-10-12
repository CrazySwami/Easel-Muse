import { useNodeConnections } from '@xyflow/react';
import { ImagePrimitive } from './primitive';
import { ImageTransform } from './transform';

export type ImageNodeProps = {
  type: string;
  data: {
    content?: {
      url: string;
      type: string;
    };
    generated?: {
      url: string;
      type: string;
    };
    size?: string;
    width?: number;
    height?: number;
    updatedAt?: string;
    model?: string;
    description?: string;
    instructions?: string;
    // Local UI toggle: when true and not connected, show generate UI
    generateMode?: boolean;
  };
  id: string;
};

export const ImageNode = (props: ImageNodeProps) => {
  const connections = useNodeConnections({
    id: props.id,
    handleType: 'target',
  });
  const hasIncomers = connections.length > 0;
  const Component = hasIncomers || props.data.generateMode ? ImageTransform : ImagePrimitive;
  return <Component key={(hasIncomers || props.data.generateMode) ? 'transform' : 'primitive'} {...props} title="Image" />;
};
