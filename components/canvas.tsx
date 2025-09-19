// @ts-nocheck
'use client';

import { updateProjectAction } from '@/app/actions/project/update';
import { useAnalytics } from '@/hooks/use-analytics';
import { useSaveProject } from '@/hooks/use-save-project';
import { handleError } from '@/lib/error/handle';
import { isValidSourceTarget } from '@/lib/xyflow';
import { NodeDropzoneProvider } from '@/providers/node-dropzone';
import { NodeOperationsProvider } from '@/providers/node-operations';
import { LocksProvider, type NodeLock } from '@/providers/locks';
import { useProject } from '@/providers/project';
import { useFlowStore } from '@/lib/flow-store';
// Liveblocks/Yjs removed in this branch
import dynamic from 'next/dynamic';
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

const StressPanel = dynamic(() => import('./stress-panel').then((m) => m.StressPanel), { ssr: false });

export const Canvas = ({ children, ...props }: ReactFlowProps) => {
  const project = useProject();
  const projectId = (project as any)?.id as string | undefined;
  // Collaboration disabled
  const enableYjs = false;
  const room = null as any;
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
  const nodes = useFlowStore((s: { nodes: Node[] }) => s.nodes);
  const edges = useFlowStore((s: { edges: Edge[] }) => s.edges);
  const setNodes = useFlowStore((s: { setNodes: (u: (p: Node[]) => Node[]) => void }) => s.setNodes);
  const setEdges = useFlowStore((s: { setEdges: (u: (p: Edge[]) => Edge[]) => void }) => s.setEdges);
  const replaceAll = useFlowStore((s: { replaceAll: (d: { nodes?: Node[]; edges?: Edge[] }) => void }) => s.replaceAll);
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
  const rAFRef = useRef<number | null>(null);
  const pendingNodeChangesRef = useRef<Parameters<OnNodesChange>[0] | null>(null);

  // Expose a minimal React Flow instance for debugging (graph size, etc.)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).reactFlowInstance = { toObject };
      return () => { try { delete (window as any).reactFlowInstance; } catch {} };
    }
  }, [toObject]);

  const yProvider = null as any;
  const ydoc = null as any;
  const yNodesMap = null as any;
  const yNodesOrder = null as any;
  const yEdgesMap = null as any;
  const yEdgesOrder = null as any;

  // Seed store once from project content (fallback if Yjs not yet populated)
  useEffect(() => {
    const hasAny = (nodes?.length ?? 0) > 0 || (edges?.length ?? 0) > 0;
    if (!hasAny && content) {
      replaceAll({ nodes: content.nodes ?? [], edges: content.edges ?? [] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Join Liveblocks Storage room via Zustand middleware so nodes/edges sync across tabs
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const disabled = window.localStorage?.getItem('disableCollab') === '1';
        if (disabled) return;
      }
      const stateAny: any = (useFlowStore as any).getState?.();
      const lb: any = stateAny?.liveblocks;
      if (!lb || !projectId) return;
      lb.enterRoom(projectId, {
        initialStorage: {
          nodes: (content?.nodes ?? []) as any,
          edges: (content?.edges ?? []) as any,
        },
      });
      return () => {
        try { lb.leaveRoom(projectId); } catch {}
      };
    } catch {}
  }, [projectId]);

  // No Liveblocks room or instrumentation in this branch

  // Seed Yjs maps & order arrays from initial content if empty
  useEffect(() => {
    if (!enableYjs || !ydoc || !yNodesMap || !yNodesOrder || !yEdgesMap || !yEdgesOrder) return;
    const hasAny = yNodesOrder.length > 0 || yEdgesOrder.length > 0;
    if (!hasAny) {
      Y.transact(ydoc, () => {
        if (nodes?.length) {
          for (const n of nodes) {
            yNodesMap.set(n.id, n);
          }
          yNodesOrder.insert(0, nodes.map((n: Node) => n.id));
        }
        if (edges?.length) {
          for (const e of edges) {
            yEdgesMap.set(e.id, e);
          }
          yEdgesOrder.insert(0, edges.map((e: Edge) => e.id));
        }
      }, 'local');
    }
  }, [enableYjs, ydoc, yNodesMap, yNodesOrder, yEdgesMap, yEdgesOrder, nodes, edges]);

  // Reset graph when switching projects to avoid leaking state across rooms
  useEffect(() => {
    if (!projectId) return;
    const nextNodes = content?.nodes ?? [];
    const nextEdges = content?.edges ?? [];

    // Replace local store with the project's content
    replaceAll({ nodes: nextNodes, edges: nextEdges });

    // Reset shared Y.Doc for the new room
    if (enableYjs && ydoc && yNodesMap && yNodesOrder && yEdgesMap && yEdgesOrder) {
      Y.transact(ydoc, () => {
        // Clear
        for (const key of Array.from(yNodesMap.keys())) yNodesMap.delete(key);
        for (const key of Array.from(yEdgesMap.keys())) yEdgesMap.delete(key);
        if (yNodesOrder.length) yNodesOrder.delete(0, yNodesOrder.length);
        if (yEdgesOrder.length) yEdgesOrder.delete(0, yEdgesOrder.length);
        // Seed
        for (const n of nextNodes) {
          yNodesMap.set(n.id, n);
        }
        if (nextNodes.length) yNodesOrder.insert(0, nextNodes.map((n: Node) => n.id));
        for (const e of nextEdges) {
          yEdgesMap.set(e.id, e);
        }
        if (nextEdges.length) yEdgesOrder.insert(0, nextEdges.map((e: Edge) => e.id));
      }, 'local');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Liveblocks Storage drives the store; no Yjs observers when disabled

  const save = useDebouncedCallback(async () => {
    // Debug toggle: disable DB saves to isolate persistence side-effects
    try {
      if (typeof window !== 'undefined' && window.localStorage?.getItem('disableSaves') === '1') {
        return;
      }
    } catch {}
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

  const flushPendingNodeChanges = useCallback(() => {
    const pending = pendingNodeChangesRef.current;
    pendingNodeChangesRef.current = null;
    if (!pending || pending.length === 0) return;

    // Acquire drag locks for nodes being moved this frame
    try {
      const draggingIds = pending
        .filter((c: any) => c.type === 'position' && c.dragging === true)
        .map((c: any) => c.id as string);
      for (const nid of draggingIds) {
        locksApi.acquire?.(nid, 'drag', 'move');
      }
    } catch {}

    if (enableYjs && ydoc && yNodesMap && yNodesOrder) {
      const hasStructural = pending.some((c) => c.type === 'add' || c.type === 'remove' || c.type === 'dimensions' || c.type === 'select');
      const includesDragEnd = pending.some((c: any) => c.type === 'position' && c.dragging === false);
      const removedIds = pending.filter((c) => c.type === 'remove').map((c: any) => c.id as string);
      const prevOrder = yNodesOrder.toArray();
      const prevMap = new Map<string, Node>();
      for (const id of prevOrder) {
        const n = yNodesMap.get(id);
        if (n) prevMap.set(id, n);
      }
      const prevArr = prevOrder.map((id) => prevMap.get(id)!).filter(Boolean) as Node[];
      const nextArr = applyNodeChanges(pending, prevArr);

      const nextOrder = nextArr.map((n) => n.id);

      Y.transact(ydoc, () => {
        if (hasStructural || includesDragEnd || nextOrder.length !== prevOrder.length || nextOrder.some((id, i) => id !== prevOrder[i])) {
          if (yNodesOrder.length) yNodesOrder.delete(0, yNodesOrder.length);
          if (nextOrder.length) yNodesOrder.insert(0, nextOrder);
        }
        // Update/insert each node object
        for (const n of nextArr as unknown as Node[]) {
          yNodesMap.set(n.id, n);
        }
        // Remove deleted nodes from map
        for (const id of prevOrder) {
          if (!nextOrder.includes(id)) yNodesMap.delete(id);
        }
        // Also prune edges that reference removed nodes
        if (removedIds.length && yEdgesMap && yEdgesOrder) {
          const prevEdgeOrder = yEdgesOrder.toArray();
          const kept: Edge[] = [];
          for (const id of prevEdgeOrder as string[]) {
            const e = yEdgesMap.get(id) as Edge | undefined;
            if (!e) continue;
            if (removedIds.includes(e.source as string) || removedIds.includes(e.target as string)) {
              yEdgesMap.delete(id);
            } else {
              kept.push(e);
            }
          }
          if (yEdgesOrder.length) yEdgesOrder.delete(0, yEdgesOrder.length);
          if (kept.length) yEdgesOrder.insert(0, kept.map((e) => e.id));
        }
      }, 'local');
      if (hasStructural || includesDragEnd) {
        save();
        // Release locks for nodes whose drag ended
        try {
          const ended = pending
            .filter((c: any) => c.type === 'position' && c.dragging === false)
            .map((c: any) => c.id as string);
          ended.forEach((nid) => locksApi.release?.(nid));
        } catch {}
      }
      onNodesChange?.(pending);
      return;
    }

    // Liveblocks Storage mode: apply directly to the shared store and save
    setNodes((current: Node[]) => applyNodeChanges(pending, current));
    const removedIdsLocal = pending.filter((c) => c.type === 'remove').map((c: any) => c.id as string);
    if (removedIdsLocal.length) {
      setEdges((current: Edge[]) => current.filter((e) => !removedIdsLocal.includes(e.source as string) && !removedIdsLocal.includes(e.target as string)));
    }
    save();
    onNodesChange?.(pending);
  }, [enableYjs, ydoc, yNodesMap, yNodesOrder, onNodesChange, save, setNodes]);

  const handleNodesChange = useCallback<OnNodesChange>((changes) => {
    // Accumulate changes and flush once per animation frame
    if (pendingNodeChangesRef.current) {
      pendingNodeChangesRef.current = [...pendingNodeChangesRef.current, ...changes];
    } else {
      pendingNodeChangesRef.current = changes;
    }

    if (rAFRef.current == null) {
      rAFRef.current = requestAnimationFrame(() => {
        rAFRef.current = null;
        flushPendingNodeChanges();
      });
    }
  }, [flushPendingNodeChanges]);

  const handleEdgesChange = useCallback<OnEdgesChange>((changes) => {
    // Apply in micro-batches to avoid overwhelming reconciliation with very large graphs
    const batchedChanges = Array.isArray(changes) && changes.length > 200 ? ((): typeof changes => {
      const out: typeof changes = [] as any;
      const chunk = 200;
      for (let i = 0; i < changes.length; i += chunk) out.push(...changes.slice(i, i + chunk));
      return out;
    })() : changes;

    if (enableYjs && ydoc && yEdgesMap && yEdgesOrder) {
      const prevOrder = yEdgesOrder.toArray();
      const prevMap = new Map<string, Edge>();
      for (const id of prevOrder) {
        const e = yEdgesMap.get(id);
        if (e) prevMap.set(id, e);
      }
      const prevArr = prevOrder.map((id) => prevMap.get(id)!).filter(Boolean) as Edge[];
      const nextArr = applyEdgeChanges(batchedChanges, prevArr);

      const nextOrder = nextArr.map((e) => e.id);
      const hasStructural = nextOrder.length !== prevOrder.length || nextOrder.some((id, i) => id !== prevOrder[i]);

      Y.transact(ydoc, () => {
        if (hasStructural) {
          if (yEdgesOrder.length) yEdgesOrder.delete(0, yEdgesOrder.length);
          if (nextOrder.length) yEdgesOrder.insert(0, nextOrder);
        }
        // Update/insert each edge object
        for (const e of nextArr) {
          yEdgesMap.set(e.id, e);
        }
        // Remove deleted edges from map
        for (const id of prevOrder) {
          if (!nextOrder.includes(id)) yEdgesMap.delete(id);
        }
      }, 'local');

      save();
      onEdgesChange?.(batchedChanges);
      return;
    }

    // Liveblocks Storage mode
    setEdges((current: Edge[]) => applyEdgeChanges(batchedChanges, current));
    save();
    onEdgesChange?.(batchedChanges);
  }, [enableYjs, ydoc, yEdgesMap, yEdgesOrder, onEdgesChange, save, setEdges]);

  const handleEdgeClick = useCallback((event: any, edge: Edge) => {
    // Alt-click (or Option-click) to delete an edge quickly
    if (!(event?.altKey || event?.metaKey || event?.ctrlKey)) return;
    if (enableYjs && ydoc && yEdgesMap && yEdgesOrder) {
      Y.transact(ydoc, () => {
        yEdgesMap.delete(edge.id);
        const order = yEdgesOrder.toArray().filter((id) => id !== edge.id);
        if (yEdgesOrder.length) yEdgesOrder.delete(0, yEdgesOrder.length);
        if (order.length) yEdgesOrder.insert(0, order);
      }, 'local');
      save();
    } else {
      setEdges((eds: Edge[]) => eds.filter((e) => e.id !== edge.id));
      save();
    }
    event?.preventDefault?.();
    event?.stopPropagation?.();
  }, [enableYjs, ydoc, yEdgesMap, yEdgesOrder, save, setEdges]);

  const handleConnect = useCallback<OnConnect>(
    (connection) => {
      // Guard against undefined/empty ids in extreme stress; generate an id if missing
      if (!(connection as any)?.source || !(connection as any)?.target) {
        return;
      }
      // Dev-only: defer transform node mount side-effects to idle when a new
      // connection is made, to reduce layout effect cascades.
      try {
        if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
          // @ts-ignore
          (window as any).requestIdleCallback(() => {});
        }
      } catch {}
      if (enableYjs && ydoc && yEdgesMap && yEdgesOrder) {
        const prevOrder = yEdgesOrder.toArray();
        const prevMap = new Map<string, Edge>();
        for (const id of prevOrder) {
          const e = yEdgesMap.get(id);
          if (e) prevMap.set(id, e);
        }
        const prevArr = prevOrder.map((id) => prevMap.get(id)!).filter(Boolean) as Edge[];
        const nextArr = addEdge(connection, prevArr);
        const nextOrder = nextArr.map((e) => e.id);

        Y.transact(ydoc, () => {
          if (yEdgesOrder.length) yEdgesOrder.delete(0, yEdgesOrder.length);
          if (nextOrder.length) yEdgesOrder.insert(0, nextOrder);
          for (const e of nextArr) yEdgesMap.set(e.id, e);
        }, 'local');
        save();
        onConnect?.(connection);
        return;
      }

      // Liveblocks Storage mode
      const newEdge: Edge = { id: nanoid(), type: 'animated', ...connection };
      setEdges((eds: Edge[]) => eds.concat(newEdge));
      save();
      onConnect?.(connection);
    },
    [save, onConnect, enableYjs, ydoc, yEdgesMap, yEdgesOrder]
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

      if (enableYjs && ydoc && yNodesMap && yNodesOrder) {
        Y.transact(ydoc, () => {
          yNodesMap.set(newNode.id, newNode);
          yNodesOrder.insert(yNodesOrder.length, [newNode.id]);
        }, 'local');
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
        save();
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
    setNodes((nodes: Node[]) => nodes.map((node: Node) => ({ ...node, selected: true })));
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
    setNodes((nodes: Node[]) => nodes.map((node: Node) => ({ ...node, selected: false })));

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

  // Minimal local locks map as a placeholder; will be backed by Yjs in a follow-up
  const locksRef = useRef<Record<string, NodeLock>>({});
  const locksApi = {
    me: { userId: 'me', color: '#3b82f6' } as any,
    locks: locksRef.current,
    isLockedByOther: (nodeId: string) => false,
    getLock: (nodeId: string) => locksRef.current[nodeId],
    acquire: (nodeId: string, reason: 'drag' | 'generating' | 'manual-edit' | 'manual-move', level: 'edit' | 'move' = 'edit') => {
      locksRef.current[nodeId] = { nodeId, userId: 'me', color: '#3b82f6', reason, level, ts: Date.now() } as NodeLock;
    },
    release: (nodeId: string) => { delete locksRef.current[nodeId]; },
  };

  return (
    <LocksProvider value={locksApi}>
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
              minZoom={0.02}
              maxZoom={2}
              zoomOnDoubleClick={false}
              panOnDrag={false}
              selectionOnDrag={false}
              onDoubleClick={addDropNode}
              {...rest}
            >
              <Background gap={28} size={2.2} />
              {/* Dev-only stress utilities */}
              {process.env.NODE_ENV !== 'production' ? <StressPanel /> : null}
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
    </LocksProvider>
  );
};
