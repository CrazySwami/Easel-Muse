import { NodeLayout } from '@/components/nodes/layout';

export type FullscreenDemoNodeProps = {
  id: string;
  type: string;
  title?: string;
  data: Record<string, any>;
};

export const FullscreenDemoNode = (props: FullscreenDemoNodeProps) => {
  const width = (props.data?.width as number) ?? 800;
  const height = (props.data?.height as number) ?? 600;
  return (
    <NodeLayout
      id={props.id}
      type={props.type}
      title={props.title ?? 'Fullscreen Demo'}
      data={{ ...props.data, width, height, fullscreenSupported: true, fullscreenOnly: true }}
    >
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6">
        <p className="text-sm text-muted-foreground">Your fullscreen content goes here.</p>
        <div className="rounded-xl border bg-white p-4">
          <p className="text-xs text-muted-foreground">Use the top-right control or context menu to enter/exit fullscreen.</p>
        </div>
      </div>
    </NodeLayout>
  );
};
