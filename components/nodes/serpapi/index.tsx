// eslint-disable-next-line @typescript-eslint/no-var-requires
const { SerpApiPrimitive } = require('./primitive') as { SerpApiPrimitive: any };

export type SerpApiNodeProps = {
  id: string;
  type: string;
  title?: string;
  data: {
    serpMode?: 'single' | 'batch' | 'aio';
    query?: string;
    queries?: string[];
    location?: string;
    hl?: string;
    gl?: string;
    results?: any[];
    outputTexts?: string[];
    outputLinks?: string[];
    updatedAt?: string;
  };
};

export const SerpApiNode = (props: SerpApiNodeProps) => {
  return <SerpApiPrimitive {...props} title={props.title ?? 'Google Search Results'} />;
};


