'use client';

import { cn } from '@/lib/utils';
import type { HTMLAttributes } from 'react';

export type MessageProps = HTMLAttributes<HTMLDivElement> & {
  from: 'user' | 'assistant' | 'system' | 'tool';
  avatarUrl?: string;
};

export const Message = ({ className, from, avatarUrl, children, ...props }: MessageProps) => (
  <div
    className={cn(
      'flex w-full items-start gap-2 py-3',
      from === 'user' ? 'justify-end' : 'justify-start',
      className
    )}
    {...props}
  >
    {from !== 'user' && (
      avatarUrl ? (
        <div className="mt-0.5 h-6 w-6 shrink-0 overflow-hidden rounded-full bg-muted p-1" aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={avatarUrl} alt="" className="h-full w-full object-contain" />
        </div>
      ) : (
        <div className="mt-0.5 h-6 w-6 shrink-0 rounded-full bg-muted" aria-hidden />
      )
    )}
    <div className={cn('max-w-[80%] rounded-lg px-3 py-2 text-sm', from === 'user' ? 'bg-emerald-600 text-white' : 'bg-muted text-foreground')}>
      {children}
    </div>
    {from === 'user' && (
      avatarUrl ? (
        <div className="mt-0.5 h-6 w-6 shrink-0 overflow-hidden rounded-full bg-muted p-0.5" aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
        </div>
      ) : (
        <div className="mt-0.5 h-6 w-6 shrink-0 rounded-full bg-emerald-600" aria-hidden />
      )
    )}
  </div>
);

export type MessageContentProps = HTMLAttributes<HTMLDivElement>;
export const MessageContent = ({ className, ...props }: MessageContentProps) => (
  <div className={cn('prose prose-sm dark:prose-invert', className)} {...props} />
);


