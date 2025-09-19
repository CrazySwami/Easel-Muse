"use client";

import { create } from "zustand";
import type { Edge, Node } from "@xyflow/react";
import { createClient } from "@liveblocks/client";
import { liveblocks } from "@liveblocks/zustand";

// No Liveblocks client

type FlowState = {
  nodes: Node[];
  edges: Edge[];
  setNodes: (updater: (prev: Node[]) => Node[]) => void;
  setEdges: (updater: (prev: Edge[]) => Edge[]) => void;
  replaceAll: (data: { nodes?: Node[]; edges?: Edge[] }) => void;
};

type Storage = EnsureJson<{
  nodes: FlowState["nodes"];
  edges: FlowState["edges"];
}>;

// Prefer Liveblocks-wrapped store when client is available; otherwise, fallback to plain Zustand
const client = createClient({
  publicApiKey: (process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY as string) || "",
  throttle: 16,
});

type FlowState = {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: (changes: any) => void;
  onEdgesChange: (changes: any) => void;
  onConnect: (connection: any) => void;
  setNodes: (updater: (prev: Node[]) => Node[]) => void;
  setEdges: (updater: (prev: Edge[]) => Edge[]) => void;
  replaceAll: (data: { nodes?: Node[]; edges?: Edge[] }) => void;
};

export const useFlowStore = create(
  liveblocks<FlowState>(
    (set, get) => ({
      nodes: [],
      edges: [],
      onNodesChange: (changes: any) => set((s: any) => ({ nodes: (require("@xyflow/react").applyNodeChanges)(changes, s.nodes) })),
      onEdgesChange: (changes: any) => set((s: any) => ({ edges: (require("@xyflow/react").applyEdgeChanges)(changes, s.edges) })),
      onConnect: (connection: any) => set((s: any) => ({ edges: (require("@xyflow/react").addEdge)(connection, s.edges) })),
      setNodes: (updater: (prev: Node[]) => Node[]) => set((s: any) => ({ nodes: updater(s.nodes) })),
      setEdges: (updater: (prev: Edge[]) => Edge[]) => set((s: any) => ({ edges: updater(s.edges) })),
      replaceAll: ({ nodes, edges }: { nodes?: Node[]; edges?: Edge[] }) =>
        set((s: any) => ({
          nodes: Array.isArray(nodes) ? nodes : s.nodes,
          edges: Array.isArray(edges) ? edges : s.edges,
        })),
    }),
    {
      client,
      storageMapping: { nodes: true, edges: true },
    }
  )
);

