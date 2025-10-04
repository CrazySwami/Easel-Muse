import { create } from 'zustand';

interface CanvasState {
  isLocked: boolean;
  toggleLock: () => void;
}

export const useCanvasStore = create<CanvasState>((set) => ({
  isLocked: false,
  toggleLock: () => set((state) => ({ isLocked: !state.isLocked })),
}));
