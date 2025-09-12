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
} from '@xyflow/react';
import { BoxSelectIcon, PlusIcon } from 'lucide-react';
import { nanoid } from 'nanoid';
import type { MouseEvent, MouseEventHandler } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { useDebouncedCallback } from 'use-debounce';
import { ConnectionLine } from './connection-line';
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
  const room = (() => { try { return useRoom(); } catch { return null as any; } })();
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
  const [nodes, setNodes] = useState<Node[]>(
    initialNodes ?? content?.nodes ?? []
  );
  const [edges, setEdges] = useState<Edge[]>(
    initialEdges ?? content?.edges ?? []
  );
  const [copiedNodes, setCopiedNodes] = useState<Node[]>([]);
  const rAFRef = useRef<number | null>(null);
  const pendingNodeChangesRef = useRef<Parameters<OnNodesChange>[0] | null>(null);

  // --- Yjs wiring (guarded by size gate) ---
  const [yEnabled, setYEnabled] = useState<boolean>(false);
  const ydocRef = useRef<Y.Doc | null>(null);
  const [yReady, setYReady] = useState<boolean>(false);
  // Create Yjs provider/doc only after mount (avoid setState during render warnings)
  useEffect(() => {
    if (!yEnabled || !room || yReady) return;
    try {
      const prov = getYjsProviderForRoom(room);
      const doc = prov.getYDoc();
      ydocRef.current = doc;
      setYReady(true);
    } catch {}
  }, [yEnabled, room, yReady]);

  // Convenient handles derived from current Y.Doc
  const ydoc = ydocRef.current;
  const yNodesMap = ydoc ? (ydoc.getMap<Node>('nodesMap') as Y.Map<Node>) : null;
  const yNodesOrder = ydoc ? (ydoc.getArray<string>('nodesOrder') as Y.Array<string>) : null;
  const yEdgesMap = ydoc ? (ydoc.getMap<Edge>('edgesMap') as Y.Map<Edge>) : null;
  const yEdgesOrder = ydoc ? (ydoc.getArray<string>('edgesOrder') as Y.Array<string>) : null;

  const uniqueById = <T extends { id: string }>(arr: T[]): T[] => {
    const seen = new Set<string>();
    const out: T[] = [];
    for (const item of arr ?? []) {
      if (!item?.id) continue;
      if (!seen.has(item.id)) { seen.add(item.id); out.push(item); }
    }
    return out;
  };
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

  // Size gate: enable Yjs only if explicitly opted-in and snapshot < 400KB
  useEffect(() => {
    try {
      if (!project?.id) return;
      const obj = toObject?.();
      const bytes = new TextEncoder().encode(JSON.stringify({ nodes: obj.nodes, edges: obj.edges })).length;
      const limit = 400 * 1024;
      const optIn = typeof window !== 'undefined' && localStorage.getItem('yjs') === 'on';
      setYEnabled(optIn && bytes <= limit);
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id]);

  // Seed Yjs from local content once
  useEffect(() => {
    if (!yEnabled || !ydoc || !yNodesMap || !yNodesOrder || !yEdgesMap || !yEdgesOrder) return;
    const hasAny = yNodesOrder.length > 0 || yEdgesOrder.length > 0;
    if (hasAny) return;
    Y.transact(ydoc, () => {
      const nn = uniqueById(nodes);
      const ee = uniqueById(edges);
      for (const n of nn) yNodesMap.set(n.id, n);
      if (nn.length) yNodesOrder.insert(0, nn.map((n) => n.id));
      for (const e of ee) yEdgesMap.set(e.id, e);
      if (ee.length) yEdgesOrder.insert(0, ee.map((e) => e.id));
    }, 'seed');
  }, [yEnabled, ydoc, yNodesMap, yNodesOrder, yEdgesMap, yEdgesOrder, nodes, edges]);

  // Observe Yjs → set local store
  useEffect(() => {
    if (!yEnabled || !ydoc || !yNodesMap || !yNodesOrder || !yEdgesMap || !yEdgesOrder) return;
    const build = () => {
      const nn: Node[] = [];
      for (const id of yNodesOrder.toArray()) {
        const n = yNodesMap.get(id);
        if (n) nn.push(n);
      }
      const ee: Edge[] = [];
      for (const id of yEdgesOrder.toArray()) {
        const e = yEdgesMap.get(id);
        if (e) ee.push(e);
      }
      setNodes(uniqueById(nn));
      setEdges(uniqueById(ee));
    };
    build();
    const onNodesMap = () => build();
    const onNodesOrder = () => build();
    const onEdgesMap = () => build();
    const onEdgesOrder = () => build();
    yNodesMap.observe(onNodesMap);
    yNodesOrder.observe(onNodesOrder);
    yEdgesMap.observe(onEdgesMap);
    yEdgesOrder.observe(onEdgesOrder);
    return () => {
      yNodesMap.unobserve(onNodesMap);
      yNodesOrder.unobserve(onNodesOrder);
      yEdgesMap.unobserve(onEdgesMap);
      yEdgesOrder.unobserve(onEdgesOrder);
    };
  }, [yEnabled, ydoc, yNodesMap, yNodesOrder, yEdgesMap, yEdgesOrder]);

  const flushPendingNodeChanges = useCallback(() => {
    const pending = pendingNodeChangesRef.current;
    pendingNodeChangesRef.current = null;
    if (!pending || pending.length === 0) return;
    if (yEnabled && ydoc && yNodesMap && yNodesOrder) {
      // Compute next array using React Flow helpers
      const prevOrder = yNodesOrder.toArray();
      const prevMap = new Map<string, Node>();
      for (const id of prevOrder) { const n = yNodesMap.get(id); if (n) prevMap.set(id, n); }
      const prevArr = prevOrder.map((id) => prevMap.get(id)!).filter(Boolean) as Node[];
      const nextArr = applyNodeChanges(pending, prevArr);
      const nextOrder = Array.from(new Set(nextArr.map((n) => n.id)));
      Y.transact(ydoc, () => {
        if (nextOrder.length !== prevOrder.length || nextOrder.some((id, i) => id !== prevOrder[i])) {
          if (yNodesOrder.length) yNodesOrder.delete(0, yNodesOrder.length);
          if (nextOrder.length) yNodesOrder.insert(0, nextOrder);
        }
        for (const n of nextArr) yNodesMap.set(n.id, n);
        for (const id of prevOrder) if (!nextOrder.includes(id)) yNodesMap.delete(id);
      }, 'nodes');
      save();
      onNodesChange?.(pending);
      return;
    }
    // Local-only fallback
    setNodes((current) => applyNodeChanges(pending, current));
    save();
    onNodesChange?.(pending);
  }, [yEnabled, ydoc, yNodesMap, yNodesOrder, onNodesChange, save]);

  const handleNodesChange = useCallback<OnNodesChange>((changes) => {
    // rAF-batch node changes when Yjs is enabled
    if (yEnabled) {
      if (pendingNodeChangesRef.current) pendingNodeChangesRef.current = [...pendingNodeChangesRef.current, ...changes];
      else pendingNodeChangesRef.current = changes;
      if (rAFRef.current == null) {
        rAFRef.current = requestAnimationFrame(() => {
          rAFRef.current = null;
          flushPendingNodeChanges();
        });
      }
      return;
    }
    // Local-only
    setNodes((current) => {
      const updated = applyNodeChanges(changes, current);
      save();
      onNodesChange?.(changes);
      return updated;
    });
  }, [yEnabled, flushPendingNodeChanges, save, onNodesChange]);

  const handleEdgesChange = useCallback<OnEdgesChange>((changes) => {
    if (yEnabled && ydoc && yEdgesMap && yEdgesOrder) {
      const prevOrder = yEdgesOrder.toArray();
      const prevMap = new Map<string, Edge>();
      for (const id of prevOrder) { const e = yEdgesMap.get(id); if (e) prevMap.set(id, e); }
      const prevArr = prevOrder.map((id) => prevMap.get(id)!).filter(Boolean) as Edge[];
      const nextArr = applyEdgeChanges(changes, prevArr);
      const nextOrder = Array.from(new Set(nextArr.map((e) => e.id)));
      Y.transact(ydoc, () => {
        if (nextOrder.length !== prevOrder.length || nextOrder.some((id, i) => id !== prevOrder[i])) {
          if (yEdgesOrder.length) yEdgesOrder.delete(0, yEdgesOrder.length);
          if (nextOrder.length) yEdgesOrder.insert(0, nextOrder);
        }
        for (const e of nextArr) yEdgesMap.set(e.id, e);
        for (const id of prevOrder) if (!nextOrder.includes(id)) yEdgesMap.delete(id);
      }, 'edges');
      save();
      onEdgesChange?.(changes);
      return;
    }
    // Local-only
    setEdges((current) => {
      const updated = applyEdgeChanges(changes, current);
      save();
      onEdgesChange?.(changes);
      return updated;
    });
  }, [yEnabled, ydoc, yEdgesMap, yEdgesOrder, onEdgesChange, save]);

  const handleConnect = useCallback<OnConnect>(
    (connection) => {
      const newEdge: Edge = {
        id: nanoid(),
        type: 'animated',
        ...connection,
      };
      if (yEnabled && ydoc && yEdgesMap && yEdgesOrder) {
        const prevOrder = yEdgesOrder.toArray();
        const prevMap = new Map<string, Edge>();
        for (const id of prevOrder) { const e = yEdgesMap.get(id); if (e) prevMap.set(id, e); }
        const prevArr = prevOrder.map((id) => prevMap.get(id)!).filter(Boolean) as Edge[];
        const nextArr = [...prevArr, newEdge];
        const nextOrder = nextArr.map((e) => e.id);
        Y.transact(ydoc, () => {
          if (yEdgesOrder.length) yEdgesOrder.delete(0, yEdgesOrder.length);
          if (nextOrder.length) yEdgesOrder.insert(0, nextOrder);
          for (const e of nextArr) yEdgesMap.set(e.id, e);
        }, 'connect');
        save();
        onConnect?.(connection);
      } else {
        setEdges((eds: Edge[]) => eds.concat(newEdge));
        save();
        onConnect?.(connection);
      }
    },
    [yEnabled, ydoc, yEdgesMap, yEdgesOrder, save, onConnect]
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

      setNodes((nds: Node[]) => nds.concat(newNode));
      save();

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
