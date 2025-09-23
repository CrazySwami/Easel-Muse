import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useLocks } from '@/providers/locks';
import { useNodeOperations } from '@/providers/node-operations';
import { Handle, Position, useReactFlow, NodeResizer, NodeToolbar as NodeToolbarRaw } from '@xyflow/react';
import { CodeIcon, CopyIcon, EyeIcon, TrashIcon, LockIcon, UnlockIcon } from 'lucide-react';
import { Fragment, type ReactNode, useState } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';

type NodeLayoutProps = {
  children: ReactNode;
  id: string;
  data?: Record<string, unknown> & {
    model?: string;
    source?: string;
    generated?: object;
  };
  title: string;
  type: string;
  toolbar?: {
    tooltip?: string;
    children: ReactNode;
  }[];
  className?: string;
};

type NodeToolbarProps = {
  id: string;
  items:
    | {
        tooltip?: string;
        children: ReactNode;
      }[]
    | undefined;
};

export const NodeLayout = ({
  children,
  type,
  id,
  data,
  toolbar,
  title,
  className,
}: NodeLayoutProps) => {
  const { deleteElements, setCenter, getNode, updateNode } = useReactFlow();
  const { duplicateNode } = useNodeOperations();
  const { getLock, acquire, release, me } = useLocks();
  const [showData, setShowData] = useState(false);

  const isResizable = Boolean((data as any)?.resizable);
  const isSelected = Boolean(getNode(id)?.selected);
  const inInspector = Boolean((data as any)?.inspector);

  const handleFocus = () => {
    const node = getNode(id);

    if (!node) {
      return;
    }

    const { x, y } = node.position;
    const width = node.measured?.width ?? 0;

    setCenter(x + width / 2, y, {
      duration: 1000,
    });
  };

  const handleDelete = () => {
    deleteElements({
      nodes: [{ id }],
    });
  };

  const handleShowData = () => {
    setTimeout(() => {
      setShowData(true);
    }, 100);
  };

  const handleSelect = (open: boolean) => {
    if (!open) {
      return;
    }

    const node = getNode(id);

    if (!node) {
      return;
    }

    if (!node.selected) {
      updateNode(id, { selected: true });
    }
  };

  const lock = getLock(id);
  const isLocked = Boolean(lock);
  const lockedByGenerating = lock?.reason === 'generating';
  const lockedByOther = isLocked && lock?.userId !== me?.userId;

  return (
    <>
      {!inInspector && toolbar && Boolean(toolbar.length) && (
        <NodeToolbarRaw
          isVisible={isSelected}
          position={Position.Bottom}
          className="flex items-center gap-1 rounded-full bg-background/40 p-1.5 backdrop-blur-sm"
        >
          {toolbar?.map((button: any, index: number) =>
            button.tooltip ? (
              <Tooltip key={button.tooltip}>
                <TooltipTrigger asChild>{button.children}</TooltipTrigger>
                <TooltipContent>{button.tooltip}</TooltipContent>
              </Tooltip>
            ) : (
              <Fragment key={index}>{button.children}</Fragment>
            )
          )}
        </NodeToolbarRaw>
      )}
      {/* handles removed in layout; Position enum not used */}
      <ContextMenu onOpenChange={handleSelect}>
        <ContextMenuTrigger>
          <div className={cn('relative', inInspector ? 'h-full w-full' : 'size-full h-auto w-sm')}>
            {!inInspector && type !== 'drop' && (
              <div className="-translate-y-full -top-2 absolute right-0 left-0 flex shrink-0 items-center justify-between">
                <p className="font-mono text-muted-foreground text-xs tracking-tighter">
                  {title}
                </p>
              </div>
            )}
            <div
              className={cn(
                inInspector
                  ? 'node-container flex h-full w-full flex-col bg-transparent p-0 ring-0 rounded-none'
                  : type === 'tiptap'
                  ? 'node-container inline-flex flex-col divide-y rounded-[28px] bg-card p-2 ring-1 ring-border transition-all'
                  : 'node-container flex size-full flex-col divide-y rounded-[28px] bg-card p-2 ring-1 ring-border transition-all',
                lockedByOther && 'pointer-events-none',
                className
              )}
              style={isLocked && !inInspector && lock?.color ? { boxShadow: `0 0 0 2px ${lock.color}` } : undefined}
            >
              {isResizable && !inInspector ? (
                <NodeResizer
                  color={'hsl(var(--primary))'}
                  minWidth={160}
                  minHeight={120}
                  isVisible={isSelected}
                  handleStyle={{ width: 10, height: 10, borderRadius: 6, background: 'hsl(var(--primary))', zIndex: 50 }}
                  lineStyle={{ borderColor: 'hsl(var(--primary))', zIndex: 40 }}
                />
              ) : null}
              <div className={cn(inInspector ? 'h-full w-full overflow-auto rounded-none bg-transparent' : 'overflow-hidden rounded-3xl bg-card')}>
                {children}
              </div>
              {!inInspector && isLocked && (
                <div className="pointer-events-none absolute -top-2 -right-2 flex items-center gap-1 rounded-full bg-card/90 px-2 py-1 text-xs text-muted-foreground ring-1 ring-border">
                  <LockIcon size={12} />
                  {lockedByGenerating ? 'Generating…' : lockedByOther ? 'Locked' : 'Locked (you)'}
                </div>
              )}
            </div>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={() => acquire(id, 'manual-edit', 'move')}>
            <LockIcon size={12} className="mr-2" />
            <span>Lock (no move)</span>
          </ContextMenuItem>
          <ContextMenuItem onClick={() => release(id)}>
            <UnlockIcon size={12} className="mr-2" />
            <span>Unlock</span>
          </ContextMenuItem>
          <ContextMenuItem onClick={() => duplicateNode(id)}>
            <CopyIcon size={12} />
            <span>Duplicate</span>
          </ContextMenuItem>
          <ContextMenuItem onClick={handleFocus}>
            <EyeIcon size={12} />
            <span>Focus</span>
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={handleDelete} variant="destructive">
            <TrashIcon size={12} />
            <span>Delete</span>
          </ContextMenuItem>
          {process.env.NODE_ENV === 'development' && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem onClick={handleShowData}>
                <CodeIcon size={12} />
                <span>Show data</span>
              </ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>
      {/* Show standard handles on both sides for connections */}
      {type !== 'drop' && <Handle type="target" position={Position.Left} />}
      {type !== 'video' && <Handle type="source" position={Position.Right} />}
      <Dialog open={showData} onOpenChange={setShowData}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Node data</DialogTitle>
            <DialogDescription>
              Data for node{' '}
              <code className="rounded-sm bg-secondary px-2 py-1 font-mono">
                {id}
              </code>
            </DialogDescription>
          </DialogHeader>
          <pre className="overflow-x-auto rounded-lg bg-black p-4 text-sm text-white">
            {JSON.stringify(data, null, 2)}
          </pre>
        </DialogContent>
      </Dialog>
    </>
  );
};
