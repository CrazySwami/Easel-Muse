'use client';

import { NodeLayout } from '@/components/nodes/layout';
import type { ComponentProps } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useReactFlow, useNodeConnections, useNodesData } from '@xyflow/react';
import type { WebRendererNodeProps } from './index';
import { getCodeFromCodeNodes } from '@/lib/xyflow';
import { useEffect } from 'react';

type WebRendererPrimitiveProps = WebRendererNodeProps & { title: string };

export const WebRendererPrimitive = (props: WebRendererPrimitiveProps) => {
  const { updateNodeData } = useReactFlow();
  const connections = useNodeConnections({ id: props.id, handleType: 'target' });
  const nodesData = useNodesData(connections.map((c) => c.source));
  const hasIncomers = connections.length > 0;

  // When a Code node is connected, its content populates the HTML
  useEffect(() => {
    if (hasIncomers && nodesData) {
      const codeNodes = getCodeFromCodeNodes(nodesData);
      const code = codeNodes.length > 0 ? codeNodes[0].text : undefined;
      if (code && code !== props.data.html) {
        updateNodeData(props.id, { html: code });
      }
    }
  }, [nodesData, hasIncomers, props.data.html, props.id, updateNodeData]);

  const toolbar: ComponentProps<typeof NodeLayout>['toolbar'] = [
    { children: <div className="px-2 text-xs text-muted-foreground">HTML/URL renderer</div> },
  ];

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => updateNodeData(props.id, { url: e.target.value });
  const handleHtmlChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => updateNodeData(props.id, { html: e.target.value });

  return (
    <NodeLayout
      id={props.id}
      type={props.type}
      title={props.title}
      toolbar={toolbar}
      data={{ ...props.data, width: 1920, height: 1080, resizable: false }}
    >
      {/* "Fill Frame" Pattern: Wrapper has h-full */}
      <div className="flex h-full flex-col gap-3 p-3">
        {/* Header Controls (Fixed Height) */}
        <div className="shrink-0 rounded-2xl border bg-muted/20 p-3">
          <div className="grid grid-cols-12 gap-3">
            <Input placeholder="https://..." value={props.data.url ?? ''} onChange={handleUrlChange} className="col-span-11" />
            <Button size="sm" className="col-span-1" onClick={() => updateNodeData(props.id, { url: props.data.url, html: undefined })}>Load</Button>
          </div>
        </div>

        {/* Main Content (Grows to fill frame) */}
        <div className="flex-1 overflow-hidden rounded-2xl border bg-card">
          <iframe
            title={`web-${props.id}`}
            srcDoc={props.data.html || ''}
            src={!props.data.html && props.data.url ? props.data.url : undefined}
            className="h-full w-full border-0"
          />
        </div>

        {/* Footer (Fixed Height) */}
        <div className="shrink-0 rounded-2xl border bg-muted/10 p-3">
          <Textarea rows={4} placeholder="Or paste HTML here (will override URL)" value={props.data.html ?? ''} onChange={handleHtmlChange} />
          <p className="mt-2 text-xs text-muted-foreground">
            {hasIncomers ? 'Rendering from connected Code node. Edit HTML here to override.' : 'Tip: Connect a Code node to feed HTML programmatically.'}
          </p>
        </div>
      </div>
    </NodeLayout>
  );
};
