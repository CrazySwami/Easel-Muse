import { useNodeConnections } from '@xyflow/react';
import { AudioPrimitive } from './primitive';
import { AudioTransform } from './transform';

export type AudioNodeProps = {
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
    voice?: string;
    transcript?: string;
    instructions?: string;
    autoTranscribe?: boolean;
    transcribing?: boolean;
  };
  id: string;
};

export const AudioNode = (props: AudioNodeProps) => {
  const connections = useNodeConnections({
    id: props.id,
    handleType: 'target',
  });
  const hasIncomers = connections.length > 0;
  const Component = hasIncomers || (props.data as any)?.generateMode ? AudioTransform : AudioPrimitive;

  return <Component key={(hasIncomers || (props.data as any)?.generateMode) ? 'transform' : 'primitive'} {...props} title="Audio" />;
};
