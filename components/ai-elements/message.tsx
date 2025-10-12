'use client';

import { cn } from '@/lib/utils';
import type { HTMLAttributes } from 'react';

export type MessageProps = HTMLAttributes<HTMLDivElement> & {
  from: 'user' | 'assistant' | 'system' | 'tool';
};

export const Message = ({ className, from, children, ...props }: MessageProps) => (
  <div
    className={cn(
      'flex w-full items-start gap-3 py-3',
      from === 'user' ? 'justify-end' : 'justify-start',
      className
    )}
    {...props}
  >
    <div className={cn('max-w-[80%] rounded-lg px-3 py-2 text-sm', from === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground')}>
      {children}
    </div>
  </div>
);

export type MessageContentProps = HTMLAttributes<HTMLDivElement>;
export const MessageContent = ({ className, ...props }: MessageContentProps) => (
  <div className={cn('prose prose-sm dark:prose-invert', className)} {...props} />
);

import {
  AIMessage,
  AIMessageContent,
} from '@/components/ui/kibo-ui/ai/message';
import type { ComponentProps } from 'react';

export type MessageProps = ComponentProps<typeof AIMessage>;
export const Message = (props: MessageProps) => <AIMessage {...props} />;

export type MessageContentProps = ComponentProps<typeof AIMessageContent>;
export const MessageContent = (props: MessageContentProps) => (
  <AIMessageContent {...props} />
);


