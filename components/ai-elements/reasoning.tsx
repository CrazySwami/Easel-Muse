'use client';

import { cn } from '@/lib/utils';
import type { HTMLAttributes } from 'react';

export const Reasoning = ({ className, ...props }: HTMLAttributes<HTMLDivElement> & { isStreaming?: boolean }) => (
  <div className={cn('rounded-md border bg-muted/50 p-2 text-xs text-muted-foreground', className)} {...props} />
);
export const ReasoningTrigger = () => null;
export const ReasoningContent = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('', className)} {...props} />
);


