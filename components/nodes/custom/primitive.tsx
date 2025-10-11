'use client';

import { NodeLayout } from '@/components/nodes/layout';
import type { ComponentProps } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useReactFlow } from '@xyflow/react';
import { cn } from '@/lib/utils';

import type { CustomNodeProps } from './index';

type CustomPrimitiveProps = CustomNodeProps & { title: string };

export const CustomPrimitive = (props: CustomPrimitiveProps) => {
  const { updateNode } = useReactFlow();

  const createToolbar = (): ComponentProps<typeof NodeLayout>['toolbar'] => {
    return [
      {
        children: (
          <div className="px-2 text-xs text-muted-foreground">Custom demo node</div>
        ),
      },
    ];
  };

  return (
    <NodeLayout
      id={props.id}
      data={{ ...props.data, width: props.data.width ?? 560, resizable: false }}
      type={props.type}
      title={props.title}
      toolbar={createToolbar()}
    >
      {/* Wrapper: flex-col, no flex-1 (Golden Rule) */}
      <div className="flex flex-col gap-3 p-3">
        {/* Header controls (fixed) */}
        <div className="shrink-0 rounded-2xl border bg-muted/20 p-3">
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="Title" />
            <Select defaultValue="option-a">
              <SelectTrigger className="w-full"><SelectValue placeholder="Option" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="option-a">Option A</SelectItem>
                <SelectItem value="option-b">Option B</SelectItem>
                <SelectItem value="option-c">Option C</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Main content (content-sized) */}
        <div className="overflow-hidden rounded-2xl border bg-secondary/40 p-3">
          <div className="grid gap-3">
            <Textarea rows={6} placeholder="Primary content area" className="min-h-[180px]" />
            <div className="grid grid-cols-3 gap-3">
              <Textarea rows={4} placeholder="Column A" />
              <Textarea rows={4} placeholder="Column B" />
              <Textarea rows={4} placeholder="Column C" />
            </div>
          </div>
        </div>

        {/* Footer (fixed) */}
        <div className="shrink-0 flex items-center justify-between rounded-2xl border bg-muted/20 p-2">
          <span className="text-xs text-muted-foreground">Status: Ready</span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary">Preview</Button>
            <Button size="sm">Run</Button>
          </div>
        </div>
      </div>
    </NodeLayout>
  );
};
