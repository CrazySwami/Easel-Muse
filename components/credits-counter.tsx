'use client';

import { getCredits } from '@/app/actions/credits/get';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/providers/subscription';
import NumberFlow from '@number-flow/react';
import { Loader2Icon } from 'lucide-react';
import Link from 'next/link';
import useSWR from 'swr';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const creditsFetcher = async () => {
  const response = await getCredits();

  if ('error' in response) {
    throw new Error(response.error);
  }

  return response;
};

const pluralize = (count: number) => (count === 1 ? 'credit' : 'credits');

export const CreditCounter = () => {
  const subscription = useSubscription();
  const { data, error } = useSWR('credits', creditsFetcher, {
    revalidateOnMount: true,
  });

  if (error) {
    return null;
  }

  if (!data) {
    return <Loader2Icon size={16} className="size-4 animate-spin" />;
  }

  const remaining = Math.max(0, data.credits);
  const tooltipLabel = data.credits <= 0 ? 'No credits remaining' : 'Credits left';

  return (
    <TooltipProvider>
      <div className="flex shrink-0 items-center gap-2 text-sm text-foreground">
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="cursor-default font-semibold">
              <NumberFlow value={remaining} />
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>{tooltipLabel}</p>
          </TooltipContent>
        </Tooltip>
        {data.credits <= 0 && subscription.plan === 'hobby' && (
          <Button size="sm" className="rounded-full" asChild>
            <Link href="/pricing">Upgrade</Link>
          </Button>
        )}
      </div>
    </TooltipProvider>
  );
};
