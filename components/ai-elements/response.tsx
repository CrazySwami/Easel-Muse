'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import type { HTMLAttributes } from 'react';

export const Response = ({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('prose prose-sm dark:prose-invert', className)} {...props}>
    <ReactMarkdown remarkPlugins={[remarkGfm]}>{String(children ?? '')}</ReactMarkdown>
  </div>
);


