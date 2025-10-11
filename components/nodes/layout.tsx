import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
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
import { Fragment, type ReactNode, useState, useMemo } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';

type NodeLayoutProps = {
  children: ReactNode;
  id: string;
  data?: Record<string, unknown> & {
    model?: string;
    source?: string;
    generated?: object;
    width?: number;
    height?: number;
    resizable?: boolean;
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
  };
  title: string;
  type: string;
  toolbar?: {
    tooltip?: string;
    children: ReactNode;
  }[];
  className?: string;
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

  // Layout intelligence: determines if the node is "Fill Frame" or "Hug Content"
  const isFillFrame = Boolean((data as any)?.height);
  const isResizable = Boolean((data as any)?.resizable) && type !== 'tiptap';
  const desiredWidth = (data as any)?.width as number | undefined;
  const desiredHeight = (data as any)?.height as number | undefined;
  const isSelected = Boolean(getNode(id)?.selected);
  const inInspector = Boolean((data as any)?.inspector);

  const handleDelete = () => deleteElements({ nodes: [{ id }] });
  const handleShowData = () => setShowData(true);

  const handleSelect = (open: boolean) => {
    if (open && !getNode(id)?.selected) {
      updateNode(id, { selected: true });
    }
  };

  const lock = getLock(id);
  const isLocked = Boolean(lock);
  const lockedByOther = isLocked && lock?.userId !== me?.userId;

  const lockLabel = useMemo(() => {
    if (!lock) return null;
    if (lock.reason === 'generating') return 'Generating...';
    if (lockedByOther) return lock.label ?? 'Locked';
    return lock.level === 'edit' ? 'Locked (you)' : 'Position locked (you)';
  }, [lock, lockedByOther]);

  return (
    <>
      {toolbar && (
        <NodeToolbarRaw isVisible={isSelected} position={Position.Bottom} className="flex items-center gap-1 rounded-full bg-background/40 p-1.5 backdrop-blur-sm">
          {toolbar.map((button, index) =>
            button.tooltip ? (
              <Tooltip key={index}><TooltipTrigger asChild>{button.children}</TooltipTrigger><TooltipContent>{button.tooltip}</TooltipContent></Tooltip>
            ) : (
              <Fragment key={index}>{button.children}</Fragment>
            )
          )}
        </NodeToolbarRaw>
      )}
      <ContextMenu onOpenChange={handleSelect}>
        <ContextMenuTrigger>
          <div
            className="relative"
            style={isResizable || desiredWidth || desiredHeight ? { width: desiredWidth, height: desiredHeight } : {}}
          >
            {!inInspector && type !== 'drop' && (
              <div className="-top-2 -translate-y-full absolute left-0 right-0 flex shrink-0 items-center justify-between">
                <p className="font-mono text-xs tracking-tighter text-muted-foreground">{title}</p>
              </div>
            )}
            <div
              className={cn(
                'node-container rounded-[28px] bg-card p-2 ring-1 ring-border transition-all',
                isFillFrame ? 'flex h-full flex-col' : 'inline-flex flex-col',
                lockedByOther && 'pointer-events-none',
                className
              )}
              style={isLocked ? { boxShadow: `0 0 0 2px ${lock?.color}` } : {}}
            >
              {isResizable && !inInspector && <NodeResizer 
                color="hsl(var(--primary))" 
                isVisible={isSelected}
                minWidth={data?.minWidth}
                maxWidth={data?.maxWidth}
                minHeight={data?.minHeight}
                maxHeight={data?.maxHeight}
              />}
              <div className={cn('overflow-hidden rounded-3xl bg-card', lock?.level === 'edit' && 'pointer-events-none', isFillFrame && 'h-full w-full')}>
                {children}
              </div>
              {isLocked && !inInspector && (
                <div className="pointer-events-none absolute -top-2 -right-2 flex items-center gap-1 rounded-full bg-card/90 px-2 py-1 text-xs text-muted-foreground ring-1 ring-border">
                  <LockIcon size={12} />
                  {lockLabel}
                </div>
              )}
            </div>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <LockIcon size={12} className="mr-2" />
              <span>Lock state</span>
            </ContextMenuSubTrigger>
            <ContextMenuSubContent>
              <ContextMenuRadioGroup
                value={lock?.level ?? 'unlocked'}
                onValueChange={(value) => {
                  if (value === 'unlocked') {
                    release(id);
                  } else {
                    acquire(id, 'manual-lock', value as 'move' | 'edit');
                  }
                }}
              >
                <ContextMenuRadioItem value="unlocked">
                  <UnlockIcon size={12} className="mr-2" />
                  <span>Unlocked</span>
                </ContextMenuRadioItem>
                <ContextMenuRadioItem value="move">
                  <LockIcon size={12} className="mr-2" />
                  <span>Lock position only</span>
                </ContextMenuRadioItem>
                <ContextMenuRadioItem value="edit">
                  <LockIcon size={12} className="mr-2" />
                  <span>Lock position & edits</span>
                </ContextMenuRadioItem>
              </ContextMenuRadioGroup>
            </ContextMenuSubContent>
          </ContextMenuSub>
          <ContextMenuItem onClick={() => duplicateNode(id)}>
            <CopyIcon size={12} />
            <span>Duplicate</span>
          </ContextMenuItem>
          <ContextMenuItem onClick={() => setShowData(true)}>
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
