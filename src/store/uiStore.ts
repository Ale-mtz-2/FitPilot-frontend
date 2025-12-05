import { create } from 'zustand';

interface UIState {
  isSidebarOpen: boolean;
  activeModal: string | null;
  modalData: any;

  // Actions
  toggleSidebar: () => void;
  setSidebarOpen: (isOpen: boolean) => void;
  openModal: (modalId: string, data?: any) => void;
  closeModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isSidebarOpen: true,
  activeModal: null,
  modalData: null,

  toggleSidebar: () => {
    set((state) => ({ isSidebarOpen: !state.isSidebarOpen }));
  },

  setSidebarOpen: (isOpen: boolean) => {
    set({ isSidebarOpen: isOpen });
  },

  openModal: (modalId: string, data?: any) => {
    set({ activeModal: modalId, modalData: data });
  },

  closeModal: () => {
    set({ activeModal: null, modalData: null });
  },
}));
