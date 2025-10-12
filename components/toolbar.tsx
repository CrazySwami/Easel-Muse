'use client';

import { nodeButtons } from '@/lib/node-buttons';
import { useNodeOperations } from '@/providers/node-operations';
import { cn } from '@/lib/utils';
import { Panel, useReactFlow } from '@xyflow/react';
import { memo, useCallback, useMemo, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { PlusIcon, XIcon } from 'lucide-react';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { Controls } from './controls';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { createPortal } from 'react-dom';

export const ToolbarInner = () => {
  const { getViewport, getNodes, setCenter, fitView, screenToFlowPosition } = useReactFlow();
  const { addNode } = useNodeOperations();
  const [isOpen, setIsOpen] = useState(false);
  const [isCmdOpen, setIsCmdOpen] = useState(false);

  const handleAddNode = useCallback(
    (type: string, options?: Record<string, unknown>) => {
      try {
        // Get the current viewport
        const viewport = getViewport();

        // Calculate the center of the current viewport
        const centerX =
          -viewport.x / viewport.zoom + window.innerWidth / 2 / viewport.zoom;
        const centerY =
          -viewport.y / viewport.zoom + window.innerHeight / 2 / viewport.zoom;

        const position = { x: centerX, y: centerY };
        const { data: nodeData, ...rest } = options ?? {};

        addNode(type, {
          position,
          data: {
            ...(nodeData ? nodeData : {}),
          },
          ...rest,
        });
        setIsOpen(false);
      } catch (error) {
        console.error('Error adding node:', error);
      }
    },
    [addNode, getViewport]
  );

  const toggleToolbar = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  // Open overlay command palette (viewport centered)
  const openCommandPalette = useCallback(() => {
    setIsCmdOpen(true);
  }, []);

  const closeCommandPalette = useCallback(() => setIsCmdOpen(false), []);

  const getPaletteDefaults = useCallback((type: string) => nodeButtons.find((b) => b.id === type)?.data as any, []);

  const handleSelectType = useCallback((type: string) => {
    try {
      const nodes = getNodes?.() ?? [];
      let maxRight = 0;
      let anchorTopY: number | null = null;
      let anchorId: string | null = null;
      for (const n of nodes) {
        const w = (n.width as number) ?? ((n.data as any)?.width ?? 680);
        const right = (n.position?.x ?? 0) + w;
        if (right >= maxRight) {
          maxRight = right;
          anchorTopY = (n.position?.y ?? 0);
          anchorId = n.id as any;
        }
      }
      const flowCenter = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
      const est = getPaletteDefaults(type) ?? {};
      const estHeight = typeof est.height === 'number' ? est.height : 520;
      const estWidth = typeof est.width === 'number' ? est.width : 680;
      // Horizontal spacing considers the next node's width to avoid overlap on large nodes
      const BASE_GAP = 240; // minimal spacing between nodes
      const GAP = BASE_GAP + Math.round(estWidth * 0.35);
      // Align top with the rightmost existing node; fallback to viewport center if none
      const topYForSpawn = anchorTopY ?? (flowCenter.y - estHeight / 2);
      const position = { x: maxRight + GAP, y: topYForSpawn };
      addNode(type, { position, data: est });
      setTimeout(() => {
        try { fitView({ nodes: [{ id: (getNodes?.() ?? []).slice(-1)[0]?.id } as any], padding: 0.5, minZoom: 0.35, duration: 500 }); } catch {}
      }, 10);
    } finally {
      closeCommandPalette();
    }
  }, [addNode, closeCommandPalette, fitView, getNodes, getPaletteDefaults, screenToFlowPosition]);

  // Global hotkey: Cmd/Ctrl+K opens the command/search palette
  useHotkeys('meta+k,ctrl+k', (e) => {
    e.preventDefault();
    openCommandPalette();
  }, { enableOnFormTags: true, preventDefault: true }, [openCommandPalette]);

  return (
    <>
      {/* Palette toggle and node list: bottom-left (original position) */}
      <Panel position="bottom-left" className="mb-12 ml-4">
        <div
          className={cn(
            'flex flex-col items-center rounded-full border bg-card/90 drop-shadow-xs backdrop-blur-sm transition-all duration-300',
            isOpen ? 'gap-2 px-2 pb-2 pt-4' : 'gap-0 p-2'
          )}
        >
          <div
            className={cn(
              'flex flex-col items-center gap-2 overflow-auto transition-all duration-200 ease-out scrollbar-none',
              isOpen ? 'max-h-[70vh] opacity-100' : 'max-h-0 opacity-0'
            )}
          >
            {nodeButtons.map((nodeButton) => (
              <div key={`toolbar-${nodeButton.id}`} className="relative">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      title={nodeButton.label}
                      className="flex h-10 w-10 items-center justify-center rounded-full border-0 bg-transparent text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                      onClick={() => handleAddNode(nodeButton.id, nodeButton.data)}
                    >
                      <nodeButton.icon size={16} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">{nodeButton.label}</TooltipContent>
                </Tooltip>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-expanded={isOpen}
              aria-label={'Open add node palette'}
              className="h-10 w-10 rounded-full bg-emerald-500 text-white transition-colors hover:bg-emerald-600"
              onClick={openCommandPalette}
            >
              <PlusIcon size={16} />
            </Button>
            <span className="select-none rounded-full border bg-card/80 px-2 py-1 text-[10px] text-muted-foreground">⌘K</span>
          </div>
        </div>
      </Panel>

      {/* Canvas controls moved to top toolbar (see TopBar -> ControlsMenu) */}

      {isCmdOpen && createPortal(
        (
          <div className="fixed inset-0 z-[10050] flex items-center justify-center">
            <div className="absolute inset-0 bg-background/40 backdrop-blur-sm" onClick={closeCommandPalette} />
            <div className="relative z-[10051] w-[640px] max-w-[90vw]">
              <Command className="rounded-3xl shadow-xl bg-card">
                <CommandInput autoFocus placeholder="Type a command or search..." />
                <CommandList className="max-h-[60vh] overflow-auto">
                  <CommandEmpty>No results found.</CommandEmpty>
                  <CommandGroup heading="Add node">
                    {nodeButtons.map((button) => (
                      <CommandItem key={button.id} onSelect={() => handleSelectType(button.id)}>
                        <button.icon size={16} />
                        {button.label}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </div>
          </div>
        ), document.body)
      }
    </>
  );
}
;

export const Toolbar = memo(ToolbarInner);
