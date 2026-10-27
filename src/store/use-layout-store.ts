import { create } from 'zustand';

export interface LayoutState {
  isSidebarCollapsed: boolean;
  isMobileSidebarOpen: boolean;
  lastSyncTime: number;
  toggleSidebar: () => void;
  toggleMobileSidebar: () => void;
  triggerSync: () => void;
}

export const useLayoutStore = create<LayoutState>((set) => ({
  isSidebarCollapsed: false,
  isMobileSidebarOpen: false,
  lastSyncTime: Date.now(),
  toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
  toggleMobileSidebar: () => set((state) => ({ isMobileSidebarOpen: !state.isMobileSidebarOpen })),
  triggerSync: () => set({ lastSyncTime: Date.now() }),
}));
