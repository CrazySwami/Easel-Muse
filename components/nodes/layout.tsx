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
import { CodeIcon, CopyIcon, EyeIcon, TrashIcon, LockIcon, UnlockIcon, Maximize2Icon, XIcon, Minimize2Icon, FileLock2Icon } from 'lucide-react';
import { Fragment, type ReactNode, useState, useMemo } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { createPortal } from 'react-dom';
import { Button } from '../ui/button';

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
    fullscreenSupported?: boolean;
    fullscreenOnly?: boolean;
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
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Layout intelligence: determines if the node is "Fill Frame" or "Hug Content"
  const isFillFrame = Boolean((data as any)?.height);
  const isResizable = Boolean((data as any)?.resizable) && type !== 'tiptap';
  const desiredWidth = (data as any)?.width as number | undefined;
  const desiredHeight = (data as any)?.height as number | undefined;
  const isSelected = Boolean(getNode(id)?.selected);
  const inInspector = Boolean((data as any)?.inspector);

  // Opt-in only: fullscreen must be explicitly enabled per node
  const fullscreenSupported = Boolean((data as any)?.fullscreenSupported);
  const fullscreenOnly = Boolean((data as any)?.fullscreenOnly);

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
    return lock.level === 'edit' ? 'Content locked' : 'Position locked';
  }, [lock, lockedByOther]);
  const isPositionLocked = lock?.level === 'move';
  const isContentLocked = lock?.level === 'edit';

  const NodeChrome = (
    <div
      className={cn(
        'node-container rounded-[28px] bg-card p-2 ring-1 ring-border transition-all',
        isFillFrame ? 'flex h-full w-full flex-col' : 'inline-flex flex-col',
        lockedByOther && 'pointer-events-none',
        className
      )}
      style={isLocked ? { boxShadow: `0 0 0 2px ${lock?.color}` } : {}}
    >
      {isResizable && !inInspector && (
        <NodeResizer
          color="hsl(var(--primary))"
          isVisible={isSelected}
          minWidth={data?.minWidth}
          maxWidth={data?.maxWidth}
          minHeight={data?.minHeight}
          maxHeight={data?.maxHeight}
        />
      )}
      {/* legacy inline fullscreen button removed; we render controls in the top bar */}
      <div className={cn('overflow-hidden rounded-3xl bg-card', lock?.level === 'edit' && 'pointer-events-none', isFillFrame && 'h-full w-full')}>
        {/* Fullscreen-only gate */}
        {fullscreenOnly && !isFullscreen ? (
          <div className="flex h-full w-full items-center justify-center p-6 text-center">
            <div className="max-w-md">
              <p className="mb-3 text-sm text-muted-foreground">This node requires fullscreen to operate.</p>
              {fullscreenSupported && (
                <button
                  className="rounded-md bg-emerald-600 px-3 py-2 text-white shadow hover:bg-emerald-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsFullscreen(true);
                  }}
                >
                  Enter fullscreen
                </button>
              )}
            </div>
          </div>
        ) : (
          children
        )}
      </div>
      {/* corner lock overlay removed in favor of explicit buttons */}
    </div>
  );

  const NormalNode = (
    <div
      className="relative"
      style={isResizable || desiredWidth || desiredHeight ? { width: desiredWidth, height: desiredHeight } : {}}
    >
      {!inInspector && type !== 'drop' && (
        <div className="absolute left-0 right-0 -top-2 -translate-y-full flex shrink-0 items-center justify-between">
          <p className="font-mono text-xs tracking-tighter text-muted-foreground">{title}</p>
        </div>
      )}
      {NodeChrome}
    </div>
  );

  const FullscreenOverlay = (
    <div className="fixed inset-0 z-[9999] flex min-h-0 flex-col bg-card ring-2 ring-emerald-600">
      <div className="absolute right-4 top-4 z-[10000]">
        <button
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white shadow hover:bg-emerald-700"
          onClick={() => setIsFullscreen(false)}
          title="Exit fullscreen"
        >
          <XIcon className="h-5 w-5" />
        </button>
      </div>
      <div className="flex h-full min-h-0 flex-col p-3">{NodeChrome}</div>
    </div>
  );

  // Node with window bar (not fullscreen)
  const NodeWithBar = (
    <div
      className="relative"
      style={isResizable || desiredWidth || desiredHeight ? { width: desiredWidth, height: desiredHeight } : {}}
    >
      {/* Green window bar above the node */}
      {!inInspector && !isFullscreen && type !== 'drop' && (
        <div className="mb-3 flex w-full items-center justify-between rounded-lg bg-emerald-600 px-2 py-1 text-white shadow">
          <div className="flex items-center gap-1">
            <button
              className="inline-flex h-6 w-6 items-center justify-center rounded-full hover:bg-emerald-600"
              title="Delete"
              onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
            >
              <XIcon className="h-3 w-3" />
            </button>
            <button
              className="inline-flex h-6 w-6 items-center justify-center rounded-full hover:bg-emerald-600"
              title="Duplicate"
              onClick={(e) => { e.stopPropagation(); duplicateNode(id); }}
            >
              <CopyIcon className="h-3 w-3" />
            </button>
            {/* Show data */}
            <button
              className="inline-flex h-6 w-6 items-center justify-center rounded-full hover:bg-emerald-600"
              title="Show data"
              onClick={(e) => { e.stopPropagation(); setShowData(true); }}
            >
              <CodeIcon className="h-3 w-3" />
            </button>
            {/* Position lock (move) */}
            <button
              className={`inline-flex h-6 w-6 items-center justify-center rounded-full hover:bg-emerald-600 ${isPositionLocked ? 'ring-2 ring-white/80' : ''}`}
              title={isPositionLocked ? 'Unlock position' : 'Lock position'}
              onClick={(e) => {
                e.stopPropagation();
                if (isPositionLocked) {
                  release(id);
                } else {
                  acquire(id, 'manual-lock', 'move');
                }
              }}
            >
              <LockIcon className="h-3 w-3" />
            </button>
            {/* Content lock (edit) */}
            <button
              className={`inline-flex h-6 w-6 items-center justify-center rounded-full hover:bg-emerald-600 ${isContentLocked ? 'ring-2 ring-white/80' : ''}`}
              title={isContentLocked ? 'Unlock content' : 'Lock content'}
              onClick={(e) => {
                e.stopPropagation();
                if (isContentLocked) {
                  release(id);
                } else {
                  acquire(id, 'manual-lock', 'edit');
                }
              }}
            >
              <FileLock2Icon className="h-3 w-3" />
            </button>
          </div>
          {fullscreenSupported && (
            <button
              className="inline-flex h-6 w-6 items-center justify-center rounded-full hover:bg-emerald-600"
              title="Enter fullscreen"
              onClick={(e) => { e.stopPropagation(); setIsFullscreen(true); }}
            >
              <Maximize2Icon className="h-3 w-3" />
            </button>
          )}
        </div>
      )}
      {/* Hide the tiny title label when the window bar is visible */}
      {(!(!inInspector && !isFullscreen)) && type !== 'drop' && (
        <div className="absolute left-0 right-0 -top-2 -translate-y-full flex shrink-0 items-center justify-between">
          <p className="font-mono text-xs tracking-tighter text-muted-foreground">{title}</p>
        </div>
      )}
      {NodeChrome}
    </div>
  );

  return (
    <>
      {toolbar && !isFullscreen && (
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
        <ContextMenuTrigger>{NodeWithBar}</ContextMenuTrigger>
        <ContextMenuContent>
          {fullscreenSupported && (
            <ContextMenuItem onClick={() => setIsFullscreen((v) => !v)}>
              {isFullscreen ? <Minimize2Icon size={12} /> : <Maximize2Icon size={12} />}
              <span>{isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}</span>
            </ContextMenuItem>
          )}
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
      {/* Delete confirm */}
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete node?</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => { setConfirmDelete(false); handleDelete(); }}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
      {isFullscreen && createPortal(FullscreenOverlay, document.body)}
    </>
  );
};
