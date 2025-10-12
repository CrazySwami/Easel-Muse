'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ArrowDownIcon } from 'lucide-react';
import { useEffect, useRef, useState, type HTMLAttributes } from 'react';

export const Conversation = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('relative flex-1 overflow-y-auto', className)} {...props} />
);

export const ConversationContent = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('p-4', className)} {...props} />
);

export const ConversationScrollButton = () => {
  const containerRef = useRef<HTMLElement | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  useEffect(() => {
    const el = document.querySelector('[role="log"]') as HTMLElement | null;
    containerRef.current = el ?? (document.querySelector('.react-flow__renderer') as any);
    const container = containerRef.current ?? document.scrollingElement as any;
    if (!container) return;
    const onScroll = () => {
      const target = container === document.scrollingElement ? document.documentElement : (container as any);
      const diff = (target.scrollHeight - target.clientHeight) - target.scrollTop;
      setIsAtBottom(diff < 24);
    };
    container.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => container.removeEventListener('scroll', onScroll);
  }, []);

  if (isAtBottom) return null;
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full"
      onClick={() => {
        const el = document.querySelector('[role="log"]') as HTMLElement | null;
        (el ?? window).scrollTo({ top: (el?.scrollHeight ?? document.body.scrollHeight), behavior: 'smooth' });
      }}
    >
      <ArrowDownIcon className="h-4 w-4" />
    </Button>
  );
};

 