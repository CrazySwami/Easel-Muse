import type { JSONContent } from '@tiptap/react';
import { TiptapPrimitive } from './primitive';

export type TiptapNodeProps = {
  type: string;
  data: {
    content?: JSONContent;
    updatedAt?: string;
  };
  id: string;
};

export const TiptapNode = (props: TiptapNodeProps) => (
  <TiptapPrimitive {...props} title="Editor" />
);
