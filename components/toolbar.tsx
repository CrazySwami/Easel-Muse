'use client';

import { nodeButtons } from '@/lib/node-buttons';
import { useNodeOperations } from '@/providers/node-operations';
import { cn } from '@/lib/utils';
import { Panel, useReactFlow } from '@xyflow/react';
import { memo, useCallback, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { PlusIcon, XIcon } from 'lucide-react';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { Controls } from './controls';

export const ToolbarInner = () => {
  const { getViewport, getNodes, setCenter } = useReactFlow();
  const { addNode } = useNodeOperations();
  const [isOpen, setIsOpen] = useState(false);

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

  // Compute a clear spot to the right of existing nodes and open the command palette there
  const openCommandPalette = useCallback(() => {
    try {
      const nodes = getNodes?.() ?? [];
      // Find farthest right edge among nodes
      let maxRight = 0;
      let centerY = 0;
      if (nodes.length) {
        // Find farthest-right node and use its vertical center for alignment
        let idx = 0;
        let bestRight = -Infinity;
        for (let i = 0; i < nodes.length; i++) {
          const n = nodes[i];
          const right = (n.position?.x ?? 0) + ((n.width as number) ?? 0);
          if (right > bestRight) { bestRight = right; idx = i; }
        }
        const anchor = nodes[idx];
        maxRight = Math.max(0, bestRight);
        const anchorCenterY = (anchor?.position?.y ?? 0) + (((anchor?.height as number) ?? 0) / 2);
        centerY = anchorCenterY;
      } else {
        const vp = getViewport();
        maxRight = -vp.x / vp.zoom + window.innerWidth / 2 / vp.zoom + 400;
        centerY = -vp.y / vp.zoom + window.innerHeight / 2 / vp.zoom;
      }
      // Desired screen-centered location (flow coords)
      const targetCenterX = maxRight + 640; // push further away from existing content
      const targetCenterY = centerY;
      // Zoom/center first so the palette appears in view
      setCenter(targetCenterX, targetCenterY, { duration: 350, zoom: 0.9 });
      // Place the drop node so its UI is visually centered (approximate dims)
      const paletteW = 640; // slightly wider to better center
      const paletteH = 420; // tune for vertical center visual alignment
      const topLeft = { x: targetCenterX - paletteW / 2, y: targetCenterY - paletteH / 2 };
      addNode('drop', { position: topLeft, data: { position: topLeft } });
    } catch (e) {
      // fallback: just toggle open list if something goes wrong
      setIsOpen(true);
    }
  }, [addNode, getNodes, getViewport, setCenter]);

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

      {/* Canvas controls: bottom-right above status checkmark */}
      <Panel position="bottom-right" className="mr-4" style={{ bottom: 50 }}>
        <Controls />
      </Panel>
    </>
  );
}
;

export const Toolbar = memo(ToolbarInner);
