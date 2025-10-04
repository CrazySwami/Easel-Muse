import { NodeLayout } from '@/components/nodes/layout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useAnalytics } from '@/hooks/use-analytics';
import { handleError } from '@/lib/error/handle';
import { getIncomers, useReactFlow } from '@xyflow/react';
import { PlayIcon, RotateCcwIcon, SquareIcon, ClockIcon } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useMemo } from 'react';
import { toast } from 'sonner';
import type { FirecrawlNodeProps } from './index';

type FirecrawlTransformProps = FirecrawlNodeProps & { title: string };

export const FirecrawlTransform = ({ data, id, type, title }: FirecrawlTransformProps) => {
  const { updateNodeData, getNodes, getEdges } = useReactFlow();
  const { projectId } = useParams();
  const analytics = useAnalytics();

  const status = data.status ?? 'idle';

  const handleGenerate = async () => {
    try {
      updateNodeData(id, { status: 'running', error: undefined });
      analytics.track('canvas', 'node', 'generate', { type, mode: data.mode ?? 'scrape' });

      const res = await fetch('/api/firecrawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, data }),
      });
      if (!res.ok) throw new Error(await res.text());
      const payload = await res.json();

      updateNodeData(id, { ...payload, status: 'completed', updatedAt: new Date().toISOString() });
      toast.success('Completed');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      handleError('Firecrawl error', message);
      updateNodeData(id, { status: 'error', error: message });
    }
  };

  const toolbar = useMemo(() => {
    const items: NonNullable<Parameters<typeof NodeLayout>[0]['toolbar']> = [];

    if (status === 'running') {
      items.push({
        tooltip: 'Stop',
        children: (
          <Button size="icon" className="rounded-full" onClick={() => updateNodeData(id, { status: 'idle' })} disabled={!projectId}>
            <SquareIcon size={12} />
          </Button>
        ),
      });
    } else if (data.generated) {
      items.push({
        tooltip: 'Regenerate',
        children: (
          <Button size="icon" className="rounded-full" onClick={handleGenerate} disabled={!projectId}>
            <RotateCcwIcon size={12} />
          </Button>
        ),
      });
    } else {
      items.push({
        tooltip: 'Generate',
        children: (
          <Button size="icon" className="rounded-full" onClick={handleGenerate} disabled={!projectId}>
            <PlayIcon size={12} />
          </Button>
        ),
      });
    }

    if (data.updatedAt) {
      items.push({
        tooltip: `Last updated: ${new Intl.DateTimeFormat('en-US', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(data.updatedAt))}`,
        children: (
          <Button size="icon" variant="ghost" className="rounded-full">
            <ClockIcon size={12} />
          </Button>
        ),
      });
    }

    return items;
  }, [status, data.generated, data.updatedAt, handleGenerate, id, projectId, updateNodeData]);

  return (
    <NodeLayout id={id} data={data} title={title} type={type} toolbar={toolbar}>
      <div className="nowheel h-full max-h-[30rem] flex-1 overflow-auto rounded-t-3xl rounded-b-xl bg-secondary p-4">
        {status === 'running' && (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-60 animate-pulse rounded-lg" />
            <Skeleton className="h-4 w-40 animate-pulse rounded-lg" />
            <Skeleton className="h-4 w-50 animate-pulse rounded-lg" />
          </div>
        )}
        {!data.generated && status !== 'running' && (
          <div className="flex aspect-video w-full items-center justify-center bg-secondary">
            <p className="text-muted-foreground text-sm">
              Press <PlayIcon size={12} className="-translate-y-px inline" /> to run
            </p>
          </div>
        )}

        {Boolean(data.generated?.doc?.markdown) && (
          <div className="prose prose-sm dark:prose-invert">
            {data.generated?.doc?.markdown}
          </div>
        )}

        {Boolean(data.generated?.pages?.length) && (
          <div className="flex flex-col gap-3">
            {data.generated?.pages?.slice(0, 10).map((p) => (
              <div key={p.url} className="rounded-md border p-3">
                <p className="mb-2 text-xs text-muted-foreground">{p.url}</p>
                {p.markdown ? <div className="prose prose-sm dark:prose-invert">{p.markdown}</div> : null}
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Optional instructions to pass to json extract mode */}
      <Textarea
        value={(data.options as any)?.jsonPrompt ?? ''}
        onChange={(e) => updateNodeData(id, { options: { ...(data.options ?? {}), jsonPrompt: e.target.value } })}
        placeholder="Optional: extraction prompt for JSON mode"
        className="shrink-0 resize-none rounded-none border-none bg-transparent! shadow-none focus-visible:ring-0"
      />
    </NodeLayout>
  );
};

export default FirecrawlTransform;

