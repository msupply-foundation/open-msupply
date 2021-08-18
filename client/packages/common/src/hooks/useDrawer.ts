import create from 'zustand';

type DrawerController = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
};

export const useDrawer = create<DrawerController>(set => {
  return {
    isOpen: true,
    open: () => set(state => ({ ...state, isOpen: true })),
    close: () => set(state => ({ ...state, isOpen: false })),
    toggle: () => set(state => ({ ...state, isOpen: !state.isOpen })),
  };
});
