import { useNodeConnections } from '@xyflow/react';
import { VideoPrimitive } from './primitive';
import { VideoTransform } from './transform';

export type VideoNodeProps = {
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
    updatedAt?: string;
    model?: string;
    instructions?: string;
    width?: number;
    height?: number;
    // Local UI toggle: when true and not connected, show generate UI
    generateMode?: boolean;
  };
  id: string;
};

export const VideoNode = (props: VideoNodeProps) => {
  const connections = useNodeConnections({
    id: props.id,
    handleType: 'target',
  });
  const hasIncomers = connections.length > 0;
  const Component = hasIncomers || props.data.generateMode ? VideoTransform : VideoPrimitive;
  return <Component key={(hasIncomers || props.data.generateMode) ? 'transform' : 'primitive'} {...props} title="Video" />;
};
