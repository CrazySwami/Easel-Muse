import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { nodeButtons } from '@/lib/node-buttons';
import { type XYPosition, useReactFlow } from '@xyflow/react';
import { nanoid } from 'nanoid';
import { useEffect, useMemo, useRef, useState } from 'react';
import { NodeLayout } from './layout';

type DropNodeProps = {
  data: {
    isSource?: boolean;
    position: XYPosition;
  };
  id: string;
};

export const DropNode = ({ data, id }: DropNodeProps) => {
  const { addNodes, deleteElements, getNode, addEdges, getEdges, getViewport } =
    useReactFlow();
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

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

    // Add the new node of the selected type
    addNodes({
      id: newNodeId,
      type,
      position,
      data: {
        ...(nodeData ? nodeData : {}),
      },
      origin: [0, 0.5],
      ...rest,
    });

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
    // Autofocus the search input when opened
    const t = setTimeout(() => {
      const input = ref.current?.querySelector(
        'input[data-slot="command-input"]'
      ) as HTMLInputElement | null;
      input?.focus();
      input?.select?.();
    }, 0);

    // Size the palette relative to current viewport zoom so it remains legible when zoomed out
    try {
      const { zoom } = getViewport();
      const s = Math.max(1, Math.min(1.8, 1.2 / Math.max(zoom, 0.1)));
      setScale(s);
    } catch {}

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
    }, 50);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('click', handleClick);
      clearTimeout(t);
    };
  }, [deleteElements, getViewport, id]);

  return (
    <div ref={ref} className="relative z-[10010]">
      <NodeLayout id={id} data={data} type="drop" title="Add a new node">
        <Command className="rounded-3xl shadow-xl w-[420px] max-h-[70vh] overflow-hidden bg-card" style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}>
          <CommandInput placeholder="Type a command or search..." />
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
                    <button.icon size={16} />
                    {button.label}
                  </CommandItem>
                ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </NodeLayout>
    </div>
  );
};
