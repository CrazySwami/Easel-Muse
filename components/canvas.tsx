'use client';

import { updateProjectAction } from '@/app/actions/project/update';
import { useAnalytics } from '@/hooks/use-analytics';
import { useSaveProject } from '@/hooks/use-save-project';
import { handleError } from '@/lib/error/handle';
import { isValidSourceTarget } from '@/lib/xyflow';
import { NodeDropzoneProvider } from '@/providers/node-dropzone';
import { NodeOperationsProvider } from '@/providers/node-operations';
import { useProject } from '@/providers/project';
import { useRoom } from '@liveblocks/react';
import { getYjsProviderForRoom } from '@liveblocks/yjs';
import * as Y from 'yjs';
import {
  Background,
  type IsValidConnection,
  type OnConnect,
  type OnConnectEnd,
  type OnConnectStart,
  type OnEdgesChange,
  type OnNodesChange,
  ReactFlow,
  type ReactFlowProps,
  getOutgoers,
  useReactFlow,
} from '@xyflow/react';
import {
  type Edge,
  type Node,
  applyEdgeChanges,
  applyNodeChanges,
  addEdge,
} from '@xyflow/react';
import { BoxSelectIcon, PlusIcon } from 'lucide-react';
import { nanoid } from 'nanoid';
import type { MouseEvent, MouseEventHandler } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { useDebouncedCallback } from 'use-debounce';
import { ConnectionLine } from './connection-line';
import { RoomAvatars } from '@/providers/liveblocks';
import { edgeTypes } from './edges';
import { nodeTypes } from './nodes';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from './ui/context-menu';

export const Canvas = ({ children, ...props }: ReactFlowProps) => {
  const project = useProject();
  const room = (() => {
    try {
      // If not rendered under a RoomProvider, this will throw
      return useRoom();
    } catch {
      return null as any;
    }
  })();
  const {
    onConnect,
    onConnectStart,
    onConnectEnd,
    onEdgesChange,
    onNodesChange,
    nodes: initialNodes,
    edges: initialEdges,
    ...rest
  } = props ?? {};
  const content = project?.content as { nodes: Node[]; edges: Edge[] };
  const [nodes, setNodes] = useState<Node[]>(initialNodes ?? content?.nodes ?? []);
  const [edges, setEdges] = useState<Edge[]>(initialEdges ?? content?.edges ?? []);
  const [copiedNodes, setCopiedNodes] = useState<Node[]>([]);
  const {
    getEdges,
    toObject,
    screenToFlowPosition,
    getNodes,
    getNode,
    updateNode,
  } = useReactFlow();
  const analytics = useAnalytics();
  const [saveState, setSaveState] = useSaveProject();

  // Yjs provider wiring (optional if RoomProvider exists)
  const yProvider = (() => {
    try {
      return room ? getYjsProviderForRoom(room) : null;
    } catch {
      return null;
    }
  })();
  const ydoc = yProvider ? yProvider.getYDoc() : null;
  const yNodesMap = ydoc ? (ydoc.getMap<Node>('nodesMap') as Y.Map<Node>) : null;
  const yEdgesMap = ydoc ? (ydoc.getMap<Edge>('edgesMap') as Y.Map<Edge>) : null;

  // Seed Yjs maps once with current content if empty
  if (ydoc && yNodesMap && yEdgesMap) {
    if (yNodesMap.size === 0 && (content?.nodes?.length ?? 0) > 0) {
      Y.transact(ydoc, () => {
        for (const n of content.nodes) yNodesMap.set(n.id, n);
      });
    }
    if (yEdgesMap.size === 0 && (content?.edges?.length ?? 0) > 0) {
      Y.transact(ydoc, () => {
        for (const e of content.edges) yEdgesMap.set(e.id, e);
      });
    }
  }

  // Subscribe to Yjs updates → React state
  // Note: effects depend on yNodes/yEdges existence
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (!yNodesMap || !yEdgesMap || !ydoc) return;

    const syncNodes = () => setNodes(Array.from(yNodesMap.values()) as Node[]);
    const syncEdges = () => setEdges(Array.from(yEdgesMap.values()) as Edge[]);

    syncNodes();
    syncEdges();
    yNodesMap.observe(syncNodes);
    yEdgesMap.observe(syncEdges);
    return () => {
      yNodesMap.unobserve(syncNodes);
      yEdgesMap.unobserve(syncEdges);
    };
  }, [yNodesMap, yEdgesMap, ydoc]);

  const save = useDebouncedCallback(async () => {
    if (saveState.isSaving || !project?.userId || !project?.id) {
      return;
    }

    try {
      setSaveState((prev) => ({ ...prev, isSaving: true }));

      const response = await updateProjectAction(project.id, {
        content: toObject(),
      });

      if ('error' in response) {
        throw new Error(response.error);
      }

      setSaveState((prev) => ({ ...prev, lastSaved: new Date() }));
    } catch (error) {
      handleError('Error saving project', error);
    } finally {
      setSaveState((prev) => ({ ...prev, isSaving: false }));
    }
  }, 1000);

  const handleNodesChange = useCallback<OnNodesChange>(
    (changes) => {
      if (yNodesMap && ydoc) {
        const prev = Array.from(yNodesMap.values()) as Node[];
        const next = applyNodeChanges(changes, prev);
        Y.transact(ydoc, () => {
          const nextById = new Map(next.map((n) => [n.id, n] as const));
          // Deletes
          for (const [id] of Array.from(yNodesMap.entries())) {
            if (!nextById.has(id)) yNodesMap.delete(id);
          }
          // Upserts
          for (const n of next) yNodesMap.set(n.id, n);
        });
        save();
        onNodesChange?.(changes);
        return;
      }

      setNodes((current) => {
        const updated = applyNodeChanges(changes, current);
        save();
        onNodesChange?.(changes);
        return updated;
      });
    },
    [save, onNodesChange, yNodesMap, ydoc]
  );

  const handleEdgesChange = useCallback<OnEdgesChange>(
    (changes) => {
      if (yEdgesMap && ydoc) {
        const prev = Array.from(yEdgesMap.values()) as Edge[];
        const next = applyEdgeChanges(changes, prev);
        Y.transact(ydoc, () => {
          const nextById = new Map(next.map((e) => [e.id, e] as const));
          for (const [id] of Array.from(yEdgesMap.entries())) {
            if (!nextById.has(id)) yEdgesMap.delete(id);
          }
          for (const e of next) yEdgesMap.set(e.id, e);
        });
        save();
        onEdgesChange?.(changes);
        return;
      }

      setEdges((current) => {
        const updated = applyEdgeChanges(changes, current);
        save();
        onEdgesChange?.(changes);
        return updated;
      });
    },
    [save, onEdgesChange, yEdgesMap, ydoc]
  );

  const handleConnect = useCallback<OnConnect>(
    (connection) => {
      if (yEdgesMap && ydoc) {
        const next = addEdge(connection, Array.from(yEdgesMap.values()) as Edge[]);
        Y.transact(ydoc, () => {
          // Rebuild as map from next list
          const nextById = new Map((next as Edge[]).map((e) => [e.id, e] as const));
          for (const [id] of Array.from(yEdgesMap.entries())) {
            if (!nextById.has(id)) yEdgesMap.delete(id);
          }
          for (const e of next as Edge[]) yEdgesMap.set(e.id, e);
        });
        save();
        onConnect?.(connection);
        return;
      }

      const newEdge: Edge = {
        id: nanoid(),
        type: 'animated',
        ...connection,
      };
      setEdges((eds: Edge[]) => eds.concat(newEdge));
      save();
      onConnect?.(connection);
    },
    [save, onConnect, yEdgesMap, ydoc]
  );

  const addNode = useCallback(
    (type: string, options?: Record<string, unknown>) => {
      const { data: nodeData, ...rest } = options ?? {};
      const newNode: Node = {
        id: nanoid(),
        type,
        data: {
          ...(nodeData ? nodeData : {}),
        },
        position: { x: 0, y: 0 },
        origin: [0, 0.5],
        ...rest,
      };

      if (yNodesMap && ydoc) {
        Y.transact(ydoc, () => {
          yNodesMap.set(newNode.id, newNode);
        });
        save();
      } else {
        setNodes((nds: Node[]) => nds.concat(newNode));
        save();
      }

      analytics.track('toolbar', 'node', 'added', {
        type,
      });

      return newNode.id;
    },
    [save, analytics]
  );

  const duplicateNode = useCallback(
    (id: string) => {
      const node = getNode(id);

      if (!node || !node.type) {
        return;
      }

      const { id: oldId, ...rest } = node;

      const newId = addNode(node.type, {
        ...rest,
        position: {
          x: node.position.x + 200,
          y: node.position.y + 200,
        },
        selected: true,
      });

      setTimeout(() => {
        updateNode(id, { selected: false });
        updateNode(newId, { selected: true });
      }, 0);
    },
    [addNode, getNode, updateNode]
  );

  const handleConnectEnd = useCallback<OnConnectEnd>(
    (event, connectionState) => {
      // when a connection is dropped on the pane it's not valid

      if (!connectionState.isValid) {
        // we need to remove the wrapper bounds, in order to get the correct position
        const { clientX, clientY } =
          'changedTouches' in event ? event.changedTouches[0] : event;

        const sourceId = connectionState.fromNode?.id;
        const isSourceHandle = connectionState.fromHandle?.type === 'source';

        if (!sourceId) {
          return;
        }

        const newNodeId = addNode('drop', {
          position: screenToFlowPosition({ x: clientX, y: clientY }),
          data: {
            isSource: !isSourceHandle,
          },
        });

        setEdges((eds: Edge[]) =>
          eds.concat({
            id: nanoid(),
            source: isSourceHandle ? sourceId : newNodeId,
            target: isSourceHandle ? newNodeId : sourceId,
            type: 'temporary',
          })
        );
      }
    },
    [addNode, screenToFlowPosition]
  );

  const isValidConnection = useCallback<IsValidConnection>(
    (connection) => {
      // we are using getNodes and getEdges helpers here
      // to make sure we create isValidConnection function only once
      const nodes = getNodes();
      const edges = getEdges();
      const target = nodes.find((node) => node.id === connection.target);

      // Prevent connecting audio nodes to anything except transcribe nodes
      if (connection.source) {
        const source = nodes.find((node) => node.id === connection.source);

        if (!source || !target) {
          return false;
        }

        const valid = isValidSourceTarget(source, target);

        if (!valid) {
          return false;
        }
      }

      // Prevent cycles
      const hasCycle = (node: Node, visited = new Set<string>()) => {
        if (visited.has(node.id)) {
          return false;
        }

        visited.add(node.id);

        for (const outgoer of getOutgoers(node, nodes, edges)) {
          if (outgoer.id === connection.source || hasCycle(outgoer, visited)) {
            return true;
          }
        }
      };

      if (!target || target.id === connection.source) {
        return false;
      }

      return !hasCycle(target);
    },
    [getNodes, getEdges]
  );

  const handleConnectStart = useCallback<OnConnectStart>(() => {
    // Delete any drop nodes when starting to drag a node
    setNodes((nds: Node[]) => nds.filter((n: Node) => n.type !== 'drop'));
    setEdges((eds: Edge[]) => eds.filter((e: Edge) => e.type !== 'temporary'));
    save();
  }, [save]);

  const addDropNode = useCallback<MouseEventHandler<HTMLDivElement>>(
    (event) => {
      if (!(event.target instanceof HTMLElement)) {
        return;
      }

      const { x, y } = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      addNode('drop', {
        position: { x, y },
      });
    },
    [addNode, screenToFlowPosition]
  );

  const handleSelectAll = useCallback(() => {
    setNodes((nodes: Node[]) =>
      nodes.map((node: Node) => ({ ...node, selected: true }))
    );
  }, []);

  const handleCopy = useCallback(() => {
    const selectedNodes = getNodes().filter((node) => node.selected);
    if (selectedNodes.length > 0) {
      setCopiedNodes(selectedNodes);
    }
  }, [getNodes]);

  const handlePaste = useCallback(() => {
    if (copiedNodes.length === 0) {
      return;
    }

    const newNodes = copiedNodes.map((node) => ({
      ...node,
      id: nanoid(),
      position: {
        x: node.position.x + 200,
        y: node.position.y + 200,
      },
      selected: true,
    }));

    // Unselect all existing nodes
    setNodes((nodes: Node[]) =>
      nodes.map((node: Node) => ({
        ...node,
        selected: false,
      }))
    );

    // Add new nodes
    setNodes((nodes: Node[]) => [...nodes, ...newNodes]);
  }, [copiedNodes]);

  const handleDuplicateAll = useCallback(() => {
    const selected = getNodes().filter((node) => node.selected);

    for (const node of selected) {
      duplicateNode(node.id);
    }
  }, [getNodes, duplicateNode]);

  const handleContextMenu = useCallback((event: MouseEvent) => {
    if (
      !(event.target instanceof HTMLElement) ||
      !event.target.classList.contains('react-flow__pane')
    ) {
      event.preventDefault();
    }
  }, []);

  useHotkeys('meta+a', handleSelectAll, {
    enableOnContentEditable: false,
    preventDefault: true,
  });

  useHotkeys('meta+d', handleDuplicateAll, {
    enableOnContentEditable: false,
    preventDefault: true,
  });

  useHotkeys('meta+c', handleCopy, {
    enableOnContentEditable: false,
    preventDefault: true,
  });

  useHotkeys('meta+v', handlePaste, {
    enableOnContentEditable: false,
    preventDefault: true,
  });

  return (
    <NodeOperationsProvider addNode={addNode} duplicateNode={duplicateNode}>
      <NodeDropzoneProvider>
        <ContextMenu>
          <ContextMenuTrigger onContextMenu={handleContextMenu}>
            <ReactFlow
              deleteKeyCode={['Backspace', 'Delete']}
              nodes={nodes}
              onNodesChange={handleNodesChange}
              edges={edges}
              onEdgesChange={handleEdgesChange}
              onConnectStart={handleConnectStart}
              onConnect={handleConnect}
              onConnectEnd={handleConnectEnd}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              isValidConnection={isValidConnection}
              connectionLineComponent={ConnectionLine}
              panOnScroll
              fitView
              zoomOnDoubleClick={false}
              panOnDrag={false}
              selectionOnDrag={true}
              onDoubleClick={addDropNode}
              {...rest}
            >
              <Background />
              {yProvider ? <RoomAvatars /> : null}
              {children}
            </ReactFlow>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem onClick={addDropNode}>
              <PlusIcon size={12} />
              <span>Add a new node</span>
            </ContextMenuItem>
            <ContextMenuItem onClick={handleSelectAll}>
              <BoxSelectIcon size={12} />
              <span>Select all</span>
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      </NodeDropzoneProvider>
    </NodeOperationsProvider>
  );
};
