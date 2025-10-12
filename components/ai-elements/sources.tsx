'use client';

import { cn } from '@/lib/utils';
import type { ComponentProps } from 'react';

export const Sources = (props: ComponentProps<'div'>) => <div {...props} />;
export const SourcesTrigger = ({ count, ...props }: ComponentProps<'button'> & { count: number }) => (
  <button type="button" className="text-xs text-primary underline" {...props}>Used {count} sources</button>
);
export const SourcesContent = (props: ComponentProps<'div'>) => <div className={cn('mt-2 flex flex-col gap-2')} {...props} />;
export const Source = (props: ComponentProps<'a'>) => (
  <a target="_blank" rel="noreferrer" className="text-xs text-muted-foreground underline" {...props} />
);


