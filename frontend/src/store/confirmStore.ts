import { create } from 'zustand';

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void | Promise<void>;
}

interface ConfirmState {
  isOpen: boolean;
  options: ConfirmOptions | null;
  isLoading: boolean;
  openConfirm: (options: ConfirmOptions) => void;
  closeConfirm: () => void;
  setLoading: (loading: boolean) => void;
}

export const useConfirmStore = create<ConfirmState>((set) => ({
  isOpen: false,
  options: null,
  isLoading: false,

  openConfirm: (options) =>
    set({ isOpen: true, options, isLoading: false }),

  closeConfirm: () =>
    set({ isOpen: false, options: null, isLoading: false }),

  setLoading: (isLoading) => set({ isLoading }),
}));

// Quick helper to trigger confirmation anywhere
export const triggerConfirm = (options: ConfirmOptions) => {
  useConfirmStore.getState().openConfirm(options);
};
