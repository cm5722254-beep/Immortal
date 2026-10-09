import { create } from 'zustand';

interface NavState {
  // Navigation state
  isSidebarOpen: boolean;
  isTopNavScrolled: boolean;

  // Actions
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setTopNavScrolled: (scrolled: boolean) => void;

  // Navigation history
  navigationStack: string[];
  pushToStack: (path: string) => void;
  popFromStack: () => void;
  clearStack: () => void;
}

export const useNavStore = create<NavState>((set, get) => ({
  // Initial state
  isSidebarOpen: false,
  isTopNavScrolled: false,
  navigationStack: [],

  // Sidebar actions
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

  // Top nav scroll state
  setTopNavScrolled: (scrolled) => set({ isTopNavScrolled: scrolled }),

  // Navigation stack
  pushToStack: (path) => {
    set((state) => ({
      navigationStack: [...state.navigationStack, path]
    }));
  },

  popFromStack: () => {
    set((state) => {
      const newStack = [...state.navigationStack];
      newStack.pop();
      return { navigationStack: newStack };
    });
  },

  clearStack: () => {
    set({ navigationStack: [] });
  }
}));