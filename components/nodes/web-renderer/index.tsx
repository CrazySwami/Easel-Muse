import { WebRendererPrimitive } from './primitive';

export type WebRendererNodeProps = {
  id: string;
  type: string;
  title?: string;
  data: {
    width?: number;
    height?: number;
    resizable?: boolean;
    html?: string;
    url?: string;
    mode?: 'url' | 'code';
    viewport?: 'mobile' | 'tablet' | 'desktop';
  };
};

export const WebRendererNode = (props: WebRendererNodeProps) => {
  return <WebRendererPrimitive {...props} title={props.title ?? 'Web Renderer'} />;
};
