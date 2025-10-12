import { NodeLayout } from '@/components/nodes/layout';
import { Textarea } from '@/components/ui/textarea';
import { useReactFlow } from '@xyflow/react';
import { type ChangeEventHandler, type ComponentProps, useCallback } from 'react';
import type { TextNodeProps } from '.';
import { CopyIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

type TextPrimitiveProps = TextNodeProps & {
  title: string;
};

export const TextPrimitive = ({
  data,
  id,
  type,
  title,
}: TextPrimitiveProps) => {
  const { updateNodeData } = useReactFlow();

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
      </div>
    </NodeLayout>
  );
};
