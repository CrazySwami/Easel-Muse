'use client';

import type { ReactNode } from 'react';
import { createContext, useContext } from 'react';

export type LockReason = 'drag' | 'generating' | 'manual-edit' | 'manual-move';
export type LockLevel = 'edit' | 'move';

export type NodeLock = {
  nodeId: string;
  userId: string;
  color?: string;
  reason: LockReason;
  level: LockLevel; // edit: block edit; move: block move & edit
  ts: number;
  label?: string;
};

type LocksContextType = {
  me?: { userId: string; color?: string } | null;
  locks: Record<string, NodeLock>;
  isLockedByOther: (nodeId: string) => boolean;
  getLock: (nodeId: string) => NodeLock | undefined;
  acquire: (nodeId: string, reason: LockReason, level?: LockLevel) => void;
  release: (nodeId: string) => void;
};

const LocksContext = createContext<LocksContextType | null>(null);

export const useLocks = () => {
  const ctx = useContext(LocksContext);
  if (!ctx) throw new Error('useLocks must be used within LocksProvider');
  return ctx;
};

export const LocksProvider = ({ value, children }: { value: LocksContextType; children: ReactNode }) => {
  return <LocksContext.Provider value={value}>{children}</LocksContext.Provider>;
};


