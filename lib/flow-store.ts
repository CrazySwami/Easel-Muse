'use client';

import { create } from 'zustand';
import type { Edge, Node } from '@xyflow/react';

type FlowState = {
  nodes: Node[];
  edges: Edge[];
  setNodes: (updater: (prev: Node[]) => Node[]) => void;
  setEdges: (updater: (prev: Edge[]) => Edge[]) => void;
  replaceAll: (data: { nodes?: Node[]; edges?: Edge[] }) => void;
};

export const useFlowStore = create<FlowState>((set) => ({
  nodes: [],
  edges: [],
  setNodes: (updater) => set((s) => ({ nodes: updater(s.nodes) })),
  setEdges: (updater) => set((s) => ({ edges: updater(s.edges) })),
  replaceAll: ({ nodes, edges }) =>
    set((s) => ({
      nodes: Array.isArray(nodes) ? nodes : s.nodes,
      edges: Array.isArray(edges) ? edges : s.edges,
    })),
}));


