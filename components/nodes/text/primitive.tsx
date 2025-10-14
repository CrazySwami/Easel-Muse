import { NodeLayout } from '@/components/nodes/layout';
import { Textarea } from '@/components/ui/textarea';
import { useReactFlow, getIncomers } from '@xyflow/react';
import { type ChangeEventHandler, type ComponentProps, useCallback } from 'react';
import type { TextNodeProps } from '.';
import { CopyIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useMemo } from 'react';
import { getLinksFromSerpapiNodes, getLinksFromPerplexityNodes, getLinksFromFirecrawlNodes } from '@/lib/xyflow';

type TextPrimitiveProps = TextNodeProps & {
  title: string;
};

export const TextPrimitive = ({
  data,
  id,
  type,
  title,
}: TextPrimitiveProps) => {
  const { updateNodeData, getNodes, getEdges } = useReactFlow();

  const handleTextChange: ChangeEventHandler<HTMLTextAreaElement> = (event) => {
    updateNodeData(id, {
      text: event.target.value,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleCopy = useCallback(() => {
    if (!data.text) return;
    navigator.clipboard.writeText(data.text);
    toast.success('Copied to clipboard');
  }, [data.text]);

  const toolbar: ComponentProps<typeof NodeLayout>['toolbar'] = [
    { children: <div className="px-2 text-xs text-muted-foreground">Plain text</div> },
    {
      tooltip: 'Copy',
      children: (
        <Button
          size="icon"
          className="rounded-full"
          disabled={!data.text}
          onClick={handleCopy}
          variant="ghost"
        >
          <CopyIcon size={12} />
        </Button>
      ),
    },
  ];

  const inboundLinks = useMemo(() => {
    try {
      const incomers = getIncomers({ id }, getNodes(), getEdges());
      const links = [
        ...getLinksFromSerpapiNodes(incomers as any),
        ...getLinksFromPerplexityNodes(incomers as any),
        ...getLinksFromFirecrawlNodes(incomers as any),
      ].filter(Boolean) as string[];
      return Array.from(new Set(links)).slice(0, 24);
    } catch {
      return [] as string[];
    }
  }, [id, getNodes, getEdges]);

  return (
    <NodeLayout
      id={id}
      data={{ ...data, width: 680, height: 520, resizable: false, dualModeSupported: true, titleOverride: 'Text' }}
      type={type}
      title={title}
      toolbar={toolbar}
    >
      {/* "Fill Frame" Pattern: Direct child has h-full */}
      <div className="flex h-full flex-col">
        <Textarea
          value={data.text}
          onChange={handleTextChange}
          placeholder="Start typing..."
          className="nodrag nopan nowheel h-full flex-1 resize-none rounded-3xl border-none bg-transparent p-4 text-lg shadow-none focus-visible:ring-0"
        />
        {inboundLinks.length > 0 && (
          <div className="shrink-0 border-t bg-muted/20 p-2">
            <div className="flex flex-wrap gap-2">
              {inboundLinks.map((u) => {
                const host = (() => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; }})();
                const icon = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=32`;
                return (
                  <a key={u} href={u} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border bg-card/60 px-2 py-1 text-xs hover:bg-accent">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={icon} alt="" className="h-4 w-4 rounded" />
                    <span className="max-w-[200px] truncate">{host}</span>
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </NodeLayout>
  );
};
