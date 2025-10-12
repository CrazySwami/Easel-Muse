import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuCheckboxItem,
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
import { CodeIcon, CopyIcon, EyeIcon, TrashIcon, LockIcon, UnlockIcon, Maximize2Icon, XIcon, Minimize2Icon, FileLock2Icon, MoveIcon } from 'lucide-react';
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
    dualModeSupported?: boolean;
    mode?: 'plain' | 'generate';
    generateMode?: boolean;
    titleOverride?: string;
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
  const { deleteElements, setCenter, getNode, updateNode, fitView } = useReactFlow();
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
  const dualModeSupported = Boolean((data as any)?.dualModeSupported);
  const modeValue = ((data as any)?.mode as 'plain' | 'generate' | undefined) ?? (((data as any)?.generateMode ? 'generate' : 'plain') as 'plain' | 'generate');

  const handleDelete = () => deleteElements({ nodes: [{ id }] });
  const handleShowData = () => setShowData(true);
  const handleFocus = () => {
    const node = getNode(id);
    if (!node) return;
    // Prefer fitView with padding so the camera doesn't get too tight
    try {
      fitView({ nodes: [{ id } as any], padding: 0.2, duration: 400 });
      return;
    } catch {}
    // Fallback: center with a small visual margin based on current size
    const x = (node as any).positionAbsolute?.x ?? (node as any).position?.x ?? 0;
    const y = (node as any).positionAbsolute?.y ?? (node as any).position?.y ?? 0;
    const width = (node as any).width ?? desiredWidth ?? 0;
    const height = (node as any).height ?? desiredHeight ?? 0;
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    try {
      setCenter(centerX, centerY, { duration: 400 });
    } catch {}
  };

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
  const isPositionLocked = lock?.level === 'move' || lock?.level === 'full';
  const isContentLocked = lock?.level === 'edit' || lock?.level === 'full';
  const allowIncoming = (data as any)?.allowIncoming ?? true;
  const allowOutgoing = (data as any)?.allowOutgoing ?? true;

  const NodeChrome = (
    <div
      className={cn(
        type === 'drop'
          ? 'bg-transparent p-0 ring-0 rounded-none shadow-none'
          : 'node-container rounded-[28px] bg-card p-2 ring-1 ring-border transition-all',
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
      <div className={cn(
        type !== 'drop' && type !== 'tiptap' ? 'overflow-hidden' : '',
        'rounded-3xl bg-card',
        (lock?.level === 'edit' || lock?.level === 'full') && 'pointer-events-none',
        isFillFrame && 'h-full w-full'
      )}>
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
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="inline-flex h-6 w-6 items-center justify-center rounded bg-red-600 text-white hover:bg-red-700"
                  onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
                >
                  <XIcon className="h-3 w-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Delete</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full hover:bg-emerald-600"
                  onClick={(e) => { e.stopPropagation(); duplicateNode(id); }}
                >
                  <CopyIcon className="h-3 w-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Duplicate</TooltipContent>
            </Tooltip>
            {/* Show data */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full hover:bg-emerald-600"
                  onClick={(e) => { e.stopPropagation(); setShowData(true); }}
                >
                  <CodeIcon className="h-3 w-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Show data</TooltipContent>
            </Tooltip>
            {/* Fullscreen on left cluster */}
            {fullscreenSupported && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="inline-flex h-6 w-6 items-center justify-center rounded-full hover:bg-emerald-600"
                    onClick={(e) => { e.stopPropagation(); setIsFullscreen(true); }}
                  >
                    <Maximize2Icon className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Enter fullscreen</TooltipContent>
              </Tooltip>
            )}
            {/* Dual-mode toggle (Plain/Generate) */}
            {dualModeSupported && (
              <div className="ml-1 inline-flex items-center rounded-full bg-white/10 p-0.5">
                <button
                  className={cn('h-6 rounded-full px-2 text-xs', modeValue === 'plain' ? 'bg-white text-emerald-700' : 'text-white hover:bg-white/10')}
                  onClick={(e) => {
                    e.stopPropagation();
                    try {
                      const node = getNode(id);
                      const nextData = { ...(node?.data as any), mode: 'plain', generateMode: false };
                      updateNode(id, { data: nextData });
                    } catch {}
                  }}
                >
                  Plain
                </button>
                <button
                  className={cn('h-6 rounded-full px-2 text-xs', modeValue === 'generate' ? 'bg-white text-emerald-700' : 'text-white hover:bg-white/10')}
                  onClick={(e) => {
                    e.stopPropagation();
                    try {
                      const node = getNode(id);
                      const nextData = { ...(node?.data as any), mode: 'generate', generateMode: true };
                      updateNode(id, { data: nextData });
                    } catch {}
                  }}
                >
                  Generate
                </button>
              </div>
            )}
          </div>
          {/* Title centered */}
          <div className="pointer-events-none select-none px-2 text-xs font-medium text-white/90 truncate">
            {(data as any)?.titleOverride ?? title}
          </div>
          {/* Right-side locks */}
          <div className="flex items-center gap-1">
            {/* Position lock (move) */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className={cn('inline-flex h-6 w-6 items-center justify-center rounded-full text-white', isPositionLocked ? 'bg-white text-emerald-700' : 'hover:bg-white/10')}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isPositionLocked) {
                      // If currently full, switch to content lock; else unlock
                      if (lock?.level === 'full') {
                        acquire(id, 'manual-lock', 'edit');
                      } else {
                        release(id);
                      }
                    } else {
                      // If content already locked, escalate to full; else lock position
                      if (isContentLocked) {
                        acquire(id, 'manual-lock', 'full');
                      } else {
                        acquire(id, 'manual-lock', 'move');
                      }
                    }
                  }}
                >
                  <MoveIcon className="h-3 w-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent>{isPositionLocked ? (lock?.level === 'full' ? 'Switch to content lock' : 'Unlock position') : 'Lock position'}</TooltipContent>
            </Tooltip>
            {/* Content lock (edit) */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className={cn('inline-flex h-6 w-6 items-center justify-center rounded-full text-white', isContentLocked ? 'bg-white text-emerald-700' : 'hover:bg-white/10')}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isContentLocked) {
                      if (lock?.level === 'full') {
                        acquire(id, 'manual-lock', 'move');
                      } else {
                        release(id);
                      }
                    } else {
                      if (isPositionLocked) {
                        acquire(id, 'manual-lock', 'full');
                      } else {
                        acquire(id, 'manual-lock', 'edit');
                      }
                    }
                  }}
                >
                  <FileLock2Icon className="h-3 w-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent>{isContentLocked ? (lock?.level === 'full' ? 'Switch to position lock' : 'Unlock content') : 'Lock content'}</TooltipContent>
            </Tooltip>
          </div>
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
              <span>Lock edits</span>
            </ContextMenuSubTrigger>
            <ContextMenuSubContent>
              <ContextMenuCheckboxItem
                checked={isPositionLocked}
                onCheckedChange={(checked) => {
                  const nextPos = Boolean(checked);
                  const nextEdit = isContentLocked;
                  if (nextPos && nextEdit) {
                    acquire(id, 'manual-lock', 'full');
                  } else if (nextPos && !nextEdit) {
                    acquire(id, 'manual-lock', 'move');
                  } else if (!nextPos && nextEdit) {
                    acquire(id, 'manual-lock', 'edit');
                  } else {
                    release(id);
                  }
                }}
              >
                <LockIcon size={12} className="mr-2" />
                <span>Lock position</span>
              </ContextMenuCheckboxItem>
              <ContextMenuCheckboxItem
                checked={isContentLocked}
                onCheckedChange={(checked) => {
                  const nextEdit = Boolean(checked);
                  const nextPos = isPositionLocked;
                  if (nextPos && nextEdit) {
                    acquire(id, 'manual-lock', 'full');
                  } else if (nextPos && !nextEdit) {
                    acquire(id, 'manual-lock', 'move');
                  } else if (!nextPos && nextEdit) {
                    acquire(id, 'manual-lock', 'edit');
                  } else {
                    release(id);
                  }
                }}
              >
                <LockIcon size={12} className="mr-2" />
                <span>Lock edits</span>
              </ContextMenuCheckboxItem>
              <ContextMenuSeparator />
              <ContextMenuItem onClick={() => release(id)}>
                <UnlockIcon size={12} className="mr-2" />
                <span>Unlock</span>
              </ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuSub>
          <ContextMenuItem onClick={() => duplicateNode(id)}>
            <CopyIcon size={12} />
            <span>Duplicate</span>
          </ContextMenuItem>
          <ContextMenuItem onClick={handleFocus}>
            <EyeIcon size={12} />
            <span>Focus</span>
          </ContextMenuItem>
          <ContextMenuItem onClick={handleShowData}>
            <CodeIcon size={12} />
            <span>Show data</span>
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
      {type !== 'drop' && allowIncoming && (
        <Handle
          type="target"
          position={Position.Left}
          className="easel-handle-target !border-2 !border-emerald-500 !bg-emerald-500/10 !shadow-sm"
          style={{ width: 22, height: 22, borderRadius: 8 }}
        />
      )}
      {type !== 'drop' && type !== 'video' && allowOutgoing && (
        <Handle
          type="source"
          position={Position.Right}
          className="easel-handle-source !border-2 !border-emerald-500 !bg-emerald-500/10 !shadow-sm"
          style={{ width: 22, height: 22, borderRadius: 8 }}
        />
      )}
      <Dialog open={showData} onOpenChange={setShowData}>
        <DialogContent className="max-h-[70vh] max-w-[80vw] overflow-auto">
          <DialogHeader>
            <DialogTitle>Node data</DialogTitle>
            <DialogDescription>
              Data for node{' '}
              <code className="rounded-sm bg-secondary px-2 py-1 font-mono">
                {id}
              </code>
            </DialogDescription>
          </DialogHeader>
          <pre className="overflow-auto max-h-[52vh] rounded-lg bg-black p-4 text-sm text-white">
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
