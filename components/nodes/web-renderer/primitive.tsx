'use client';

import { NodeLayout } from '@/components/nodes/layout';
import type { ComponentProps } from 'react';
import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useReactFlow, useNodeConnections, useNodesData } from '@xyflow/react';
import type { Node } from '@xyflow/react';
import type { WebRendererNodeProps } from './index';
import { getCodeFromCodeNodes } from '@/lib/xyflow';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronsUpDownIcon } from 'lucide-react';

type WebRendererPrimitiveProps = WebRendererNodeProps & { title: string };

export const WebRendererPrimitive = (props: WebRendererPrimitiveProps) => {
  const { updateNodeData } = useReactFlow();
  const connections = useNodeConnections({ id: props.id, handleType: 'target' });
  const nodesData = useNodesData(connections.map((c) => c.source));
  const hasIncomers = connections.length > 0;
  const [isEditorOpen, setIsEditorOpen] = useState(true);
  const mode = (props.data as any)?.mode ?? ((props.data?.html && props.data.html.length > 0) ? 'code' : 'url');
  const [isLoadingSource, setIsLoadingSource] = useState(false);

  // When a Code node is connected, its content populates the HTML (only in 'code' mode)
  useEffect(() => {
    if (mode === 'code' && hasIncomers && nodesData) {
      const codeNodes = getCodeFromCodeNodes(nodesData as unknown as Node[]);
      const code = codeNodes.length > 0 ? codeNodes[0].text : undefined;
      if (code && code !== props.data.html) {
        // Enforce HTML mode: set html, clear url
        updateNodeData(props.id, { html: code, url: '', mode: 'code' });
      }
    }
  }, [nodesData, hasIncomers, props.data.html, props.id, updateNodeData, mode]);

  const toolbar: ComponentProps<typeof NodeLayout>['toolbar'] = [
    { children: <div className="px-2 text-xs text-muted-foreground">HTML/URL renderer</div> },
  ];

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => updateNodeData(props.id, { url: e.target.value, mode: 'url' });
  const handleHtmlChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => updateNodeData(props.id, { html: e.target.value, mode: 'code' });

  const handleLoadSource = async () => {
    if (!props.data.url) return;
    try {
      setIsLoadingSource(true);
      const res = await fetch(`/api/proxy?url=${encodeURIComponent(props.data.url)}`);
      const text = await res.text();
      updateNodeData(props.id, { html: text, mode: 'code' });
    } catch (err) {
      updateNodeData(props.id, { html: '<p>Failed to load page source. Check CORS or URL.</p>', mode: 'code' });
    } finally {
      setIsLoadingSource(false);
    }
  };

  const viewport = (props.data as any)?.viewport ?? 'desktop';
  const viewportWidth = viewport === 'mobile' ? 390 : viewport === 'tablet' ? 768 : undefined;

  return (
    <NodeLayout
      id={props.id}
      type={props.type}
      title={props.title}
      toolbar={toolbar}
      data={{ ...props.data, width: 1920, height: 1080, resizable: false, fullscreenSupported: true, fullscreenOnly: false }}
    >
      {/* "Fill Frame" Pattern: Wrapper has h-full */}
      <div className="flex h-full flex-col gap-3 p-3">
        {/* Header Controls (Fixed Height) */}
        <div className="shrink-0 rounded-2xl border bg-muted/20 p-3">
          <div className="flex items-center gap-3">
            {mode === 'url' ? (
              <>
                <Input placeholder="https://..." value={props.data.url ?? ''} onChange={handleUrlChange} className="flex-1" />
                <Button size="sm" onClick={() => updateNodeData(props.id, { html: undefined, mode: 'url' })}>Load</Button>
                <Button size="sm" variant="secondary" disabled={isLoadingSource || !props.data.url} onClick={handleLoadSource}>
                  {isLoadingSource ? 'Loading…' : 'Load Source'}
                </Button>
              </>
            ) : (
              <div className="text-xs text-muted-foreground">Rendering from Code input</div>
            )}
            <div className="ml-auto inline-flex rounded-md border p-0.5">
              <Button
                type="button"
                size="sm"
                variant={mode === 'url' ? 'default' : 'ghost'}
                className="h-8 px-2"
                onClick={() => updateNodeData(props.id, { mode: 'url' })}
              >URL</Button>
              <Button
                type="button"
                size="sm"
                variant={mode === 'code' ? 'default' : 'ghost'}
                className="h-8 px-2"
                onClick={() => updateNodeData(props.id, { mode: 'code' })}
              >Code</Button>
            </div>
            <div className="inline-flex rounded-md border p-0.5">
              <Button
                type="button"
                size="sm"
                variant={viewport === 'mobile' ? 'default' : 'ghost'}
                className="h-8 px-2"
                onClick={() => updateNodeData(props.id, { viewport: 'mobile' })}
              >Mobile</Button>
              <Button
                type="button"
                size="sm"
                variant={viewport === 'tablet' ? 'default' : 'ghost'}
                className="h-8 px-2"
                onClick={() => updateNodeData(props.id, { viewport: 'tablet' })}
              >Tablet</Button>
              <Button
                type="button"
                size="sm"
                variant={viewport === 'desktop' ? 'default' : 'ghost'}
                className="h-8 px-2"
                onClick={() => updateNodeData(props.id, { viewport: 'desktop' })}
              >Desktop</Button>
            </div>
          </div>
        </div>

        {/* Main Content (Grows to fill frame) */}
        <div className="flex-1 overflow-hidden rounded-2xl border bg-card">
          <iframe
            title={`web-${props.id}`}
            srcDoc={mode === 'code' ? (props.data.html || '') : undefined}
            src={mode === 'url' && props.data.url ? props.data.url : undefined}
            className="h-full border-0 mx-auto"
            style={viewportWidth ? { width: viewportWidth } : { width: '100%' }}
            sandbox="allow-scripts allow-same-origin"
          />
        </div>

        {/* Footer (Fixed Height & Collapsible) - visible only in Code mode */}
        {mode === 'code' && (
          <Collapsible open={isEditorOpen} onOpenChange={setIsEditorOpen} className="shrink-0">
            <div className="flex items-center justify-end px-3">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8">
                  <span className="text-xs text-muted-foreground">{isEditorOpen ? 'Hide' : 'Show'} HTML Editor</span>
                  <ChevronsUpDownIcon className="h-3 w-3 ml-2" />
                </Button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent>
              <div className="shrink-0 rounded-2xl border bg-muted/10 p-3 mt-1">
                <Textarea
                  rows={4}
                  placeholder="Or paste HTML here (will override URL)"
                  value={props.data.html ?? ''}
                  onChange={handleHtmlChange}
                  className="max-h-40"
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  {hasIncomers ? 'Rendering from connected Code node. Edit HTML here to override.' : 'Tip: Connect a Code node to feed HTML programmatically.'}
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    </NodeLayout>
  );
};
