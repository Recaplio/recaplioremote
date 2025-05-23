import { create } from 'zustand';

interface UIState {
  theme: 'light' | 'dark';
  isModalOpen: boolean;
  modalContent: React.ReactNode | null;
  toggleTheme: () => void;
  openModal: (content: React.ReactNode) => void;
  closeModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  theme: 'light', // Default theme
  isModalOpen: false,
  modalContent: null,
  toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
  openModal: (content) => set({ isModalOpen: true, modalContent: content }),
  closeModal: () => set({ isModalOpen: false, modalContent: null }),
})); 