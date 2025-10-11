'use client';

import { nodeButtons } from '@/lib/node-buttons';
import { useNodeOperations } from '@/providers/node-operations';
import { cn } from '@/lib/utils';
import { Panel, useReactFlow } from '@xyflow/react';
import { memo, useCallback, useState } from 'react';
import { PlusIcon, XIcon } from 'lucide-react';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { Controls } from './controls';

export const ToolbarInner = () => {
  const { getViewport } = useReactFlow();
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

  return (
    <Panel position="bottom-right" className="mb-24 mr-4">
      <div className="flex items-end gap-3">
        <div
          className={cn(
            'flex flex-col items-center rounded-full border bg-card/90 drop-shadow-xs backdrop-blur-sm transition-all duration-300',
            isOpen ? 'gap-2 px-2 pb-2 pt-4' : 'gap-0 p-2'
          )}
        >
          <div
            className={cn(
              'flex flex-col items-center gap-2 overflow-auto transition-all duration-200 ease-out',
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
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-expanded={isOpen}
            aria-label={isOpen ? 'Close node toolbar' : 'Open node toolbar'}
            className="h-10 w-10 rounded-full bg-emerald-500 text-white transition-colors hover:bg-emerald-600"
            onClick={toggleToolbar}
          >
            {isOpen ? <XIcon size={16} /> : <PlusIcon size={16} />}
          </Button>
        </div>
        <div className="mb-1">
          <Controls />
        </div>
      </div>
    </Panel>
  );
}
;

export const Toolbar = memo(ToolbarInner);
