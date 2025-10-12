import { AIComparePrimitive } from './primitive';

export type AICompareNodeProps = {
  id: string;
  type: string;
  title?: string;
  data: {
    width?: number;
    height?: number;
    resizable?: boolean;
    fullscreenSupported?: boolean;
    inputMode?: 'single' | 'batch';
    queries?: string[];
    batchStatuses?: Array<'idle' | 'running' | 'done' | 'error'>;
    selectedQueryIndex?: number;
    results?: Record<string, any> | null;
  };
};

export const AICompareNode = (props: AICompareNodeProps) => {
  return <AIComparePrimitive {...props} title={props.title ?? 'AI Compare'} />;
};


