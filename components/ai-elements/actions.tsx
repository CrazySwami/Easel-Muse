'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { ComponentProps, HTMLAttributes } from 'react';

export const Actions = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex items-center gap-2', className)} {...props} />
);

export type ActionProps = ComponentProps<typeof Button> & {
  label?: string;
};

export const Action = ({ label, children, ...props }: ActionProps) => (
  <Button size="sm" variant="outline" {...props}>
    {children}
    {label ? <span className="ml-1.5">{label}</span> : null}
  </Button>
);


