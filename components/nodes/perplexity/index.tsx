import { PerplexityPrimitive } from './primitive';

export type PerplexityNodeProps = {
  id: string;
  type: string;
  title?: string;
  data: {
    width?: number;
    height?: number;
    resizable?: boolean;
    minWidth?: number;
    minHeight?: number;
    inputMode?: 'single' | 'batch' | 'generate';
    apiMode?: 'search' | 'chat';
    queries?: string[];
    generatePrompt?: string;
    model?: string;
    results?: any[]; // Replace with a more specific type
    chatResponse?: string;
  };
};

export const PerplexityNode = (props: PerplexityNodeProps) => {
  return <PerplexityPrimitive {...props} title={props.title ?? 'Perplexity Search'} />;
};
