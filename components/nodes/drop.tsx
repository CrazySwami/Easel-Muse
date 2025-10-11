import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { nodeButtons } from '@/lib/node-buttons';
import { type XYPosition, useReactFlow, useStore } from '@xyflow/react';
import { nanoid } from 'nanoid';
import { useEffect, useMemo, useRef } from 'react';
import { NodeLayout } from './layout';

type DropNodeProps = {
  data: {
    isSource?: boolean;
    position: XYPosition;
  };
  id: string;
};

export const DropNode = ({ data, id }: DropNodeProps) => {
  const { addNodes, deleteElements, getNode, addEdges, getEdges, fitView, setCenter } =
    useReactFlow();
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Track current canvas zoom to scale the palette for readability when zoomed out
  const zoom = useStore((s: any) => (Array.isArray(s.transform) ? s.transform[2] : s.zoom ?? 1));
  const scale = useMemo(() => {
    if (!zoom || typeof zoom !== 'number') return 1;
    // Upscale when zoomed out (<1), keep at 1 otherwise; clamp to 2x
    return Math.min(2, zoom < 1 ? 1 / zoom : 1);
  }, [zoom]);

  const handleSelect = (type: string, options?: Record<string, unknown>) => {
    // Get the position of the current node
    const currentNode = getNode(id);
    const position = currentNode?.position || { x: 0, y: 0 };
    // Find the temporary edge attached to this drop node (there should be one)
    const temp = getEdges().find((e) => e.type === 'temporary' && (e.source === id || e.target === id));

    // Delete the drop node
    deleteElements({
      nodes: [{ id }],
    });

    const newNodeId = nanoid();
    const { data: nodeData, ...rest } = options ?? {};

    // Add the new node of the selected type, offset to the right of the far-right anchor
    const NODE_GAP_X = 360; // distance from anchor to new node left edge (more space)
    const NODE_GAP_Y = 0;
    const spawn = { x: position.x + NODE_GAP_X, y: position.y + NODE_GAP_Y };
    addNodes({
      id: newNodeId,
      type,
      position: spawn,
      data: {
        ...(nodeData ? nodeData : {}),
      },
      origin: [0, 0.5],
      ...rest,
    });

    // Center/zoom on the new node shortly after it mounts
    try {
      setTimeout(() => {
        try {
          fitView({ nodes: [{ id: newNodeId } as any], padding: 0.3, duration: 400, minZoom: 0.5 });
        } catch {
          setCenter(spawn.x + 200, spawn.y + 150, { duration: 350, zoom: 0.8 });
        }
      }, 10);
    } catch {}

    if (temp) {
      addEdges({
        id: nanoid(),
        source: temp.source === id ? newNodeId : temp.source,
        target: temp.target === id ? newNodeId : temp.target,
        type: 'animated',
      });
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // Delete the drop node when Escape is pressed
        deleteElements({
          nodes: [{ id }],
        });
      }
    };

    const handleClick = (event: MouseEvent) => {
      // Get the DOM element for this node
      const nodeElement = ref.current;

      // Check if the click was outside the node
      if (nodeElement && !nodeElement.contains(event.target as Node)) {
        deleteElements({
          nodes: [{ id }],
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    setTimeout(() => {
      window.addEventListener('click', handleClick);
      // Autofocus the search input after mount
      requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
    }, 50);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('click', handleClick);
    };
  }, [deleteElements, id]);

  return (
    <div ref={ref} className="relative z-[10010]">
      <NodeLayout id={id} data={data} type="drop" title="Add a new node">
        <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}>
          <Command className="rounded-3xl shadow-xl w-[560px] max-h-[70vh] bg-card">
            <CommandInput ref={inputRef} placeholder="Type a command or search..." />
            <CommandList className="max-h-[58vh] overflow-auto">
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup heading="Add node">
              {nodeButtons
                .filter(
                  (button) => button.id !== 'file' && button.id !== 'tweet'
                )
                .map((button) => (
                  <CommandItem
                    key={button.id}
                    onSelect={() => handleSelect(button.id, button.data)}
                  >
                      <div className="flex items-center gap-3">
                        <button.icon size={18} />
                        <span className="text-sm">{button.label}</span>
                      </div>
                  </CommandItem>
                ))}
            </CommandGroup>
            </CommandList>
          </Command>
        </div>
      </NodeLayout>
    </div>
  );
};
