import { NodeLayout } from '@/components/nodes/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useAnalytics } from '@/hooks/use-analytics';
import { handleError } from '@/lib/error/handle';
import { cn } from '@/lib/utils';
import { useProject } from '@/providers/project';
import { useState, type ChangeEventHandler, useMemo, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import type { FirecrawlNodeProps, FirecrawlMode } from './index';
import { getIncomers, useReactFlow } from '@xyflow/react';
import { CopyIcon, PlayIcon, RotateCcwIcon, SquareIcon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

type FirecrawlPrimitiveProps = FirecrawlNodeProps & {
  title: string;
};

export const FirecrawlPrimitive = ({ data, id, type, title }: FirecrawlPrimitiveProps) => {
  const { updateNodeData } = useReactFlow();
  const project = useProject();
  const analytics = useAnalytics();
  const status = data.status ?? 'idle';

  useEffect(() => {
    const updates: Record<string, unknown> = {};
    if (data.resizable) updates.resizable = false;
    if (!data.width) updates.width = 840;
    if (!data.height) updates.height = 560;
    if (Object.keys(updates).length) updateNodeData(id, updates);
  }, [data.resizable, data.width, data.height, id, updateNodeData]);

  const setUrl: ChangeEventHandler<HTMLInputElement> = (e) => updateNodeData(id, { url: e.target.value });
  const setEmit = (emit: NonNullable<FirecrawlNodeProps['data']['emit']>) => updateNodeData(id, { emit });

  const handleGenerate = async () => {
    try {
      updateNodeData(id, { status: 'running', error: undefined });
      analytics.track('canvas', 'node', 'generate', { type, mode: 'scrape' });

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

  const handleCopy = useCallback(() => {
    if (!data.generated?.doc) return;

    let contentToCopy = '';
    const doc = data.generated.doc;
    const emit = data.emit ?? 'markdown';

    if (emit === 'markdown' && doc.markdown) {
      contentToCopy = doc.markdown;
    } else if (emit === 'html' && doc.html) {
      contentToCopy = doc.html;
    } else if (emit === 'links' && doc.links) {
      contentToCopy = doc.links.join('\n');
    } else if (emit === 'json' && doc.json) {
      contentToCopy = JSON.stringify(doc.json, null, 2);
    }

    if (contentToCopy) {
      navigator.clipboard.writeText(contentToCopy);
      toast.success('Copied to clipboard');
    }
  }, [data.generated, data.emit]);

  const toolbar = useMemo(() => {
    const items: NonNullable<Parameters<typeof NodeLayout>[0]['toolbar']> = [];
    if (status === 'running') {
      items.push({
        tooltip: 'Stop',
        children: (
          <Button size="icon" className="rounded-full" disabled={!project?.id} onClick={() => updateNodeData(id, { status: 'idle' })}>
            <SquareIcon size={12} />
          </Button>
        ),
      });
    } else if (data.generated) {
      items.push({
        tooltip: 'Regenerate',
        children: (
          <Button size="icon" className="rounded-full" disabled={!project?.id} onClick={handleGenerate}>
            <RotateCcwIcon size={12} />
          </Button>
        ),
      });
    } else {
      items.push({
        tooltip: 'Generate',
        children: (
          <Button size="icon" className="rounded-full" disabled={!project?.id} onClick={handleGenerate}>
            <PlayIcon size={12} />
          </Button>
        ),
      });
    }
    return items;
  }, [status, data.generated, handleGenerate, id, project?.id, updateNodeData]);

  return (
    <NodeLayout id={id} data={data} title={title} type={type} toolbar={toolbar}>
      <div className="nowheel flex h-full min-w-[420px] flex-col items-stretch gap-3 overflow-hidden p-3">
        {/* Top: Options */}
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-[1fr_auto] items-end gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="fc-url">URL</Label>
              <Input id="fc-url" placeholder="https://example.com" defaultValue={data.url ?? ''} onChange={setUrl} />
            </div>
            <div className="flex flex-col gap-1">
              <Label>View</Label>
              <Select value={data.emit ?? 'markdown'} onValueChange={(v) => setEmit(v as any)}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="markdown">Markdown</SelectItem>
                  <SelectItem value="html">HTML</SelectItem>
                  <SelectItem value="links">Links</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-1">
            <Button className="w-full" onClick={handleGenerate} disabled={!project?.id || status === 'running'}>
              <PlayIcon size={14} className="-translate-y-px mr-2 inline" />
              Run Scrape
            </Button>
          </div>
        </div>

        {/* Bottom: Output */}
        <div className="relative h-full min-h-[280px] flex-1 overflow-auto rounded-lg border bg-secondary p-3">
          {data.generated?.doc && (
            <Button size="icon" variant="ghost" className="absolute right-2 top-2 z-10 h-7 w-7" onClick={handleCopy}>
              <CopyIcon size={14} />
            </Button>
          )}

          {!data.generated && status !== 'running' && (
            <div className="flex h-full w-full items-center justify-center">
              <p className="text-muted-foreground text-sm">Run to view results</p>
            </div>
          )}

          {/* MARKDOWN */}
          {(data.emit === 'markdown' || !data.emit) && (
            <>
              {data.generated?.doc?.markdown && (
                <div className="prose prose-sm dark:prose-invert">
                  <ReactMarkdown>{data.generated.doc.markdown}</ReactMarkdown>
                </div>
              )}
            </>
          )}

          {/* HTML */}
          {data.emit === 'html' && (
            <>
              {data.generated?.doc?.html && (
                <pre className="whitespace-pre-wrap text-xs">{data.generated.doc.html}</pre>
              )}
            </>
          )}

          {/* LINKS */}
          {data.emit === 'links' && (
            <ul className="list-disc pl-5 text-sm">
              {(data.generated?.doc?.links ?? [])
                .slice(0, 50)
                .map((u) => (
                  <li key={u} className="truncate"><a href={u} target="_blank" rel="noreferrer" className="underline">{u}</a></li>
                ))}
            </ul>
          )}

          {/* JSON */}
          {data.emit === 'json' && (
            <pre className="overflow-auto rounded-md bg-background p-3 text-xs">
              {JSON.stringify(
                data.generated?.doc?.json ?? data.generated?.doc,
                null,
                2,
              )}
            </pre>
          )}
        </div>
      </div>
    </NodeLayout>
  );
};

export default FirecrawlPrimitive;

