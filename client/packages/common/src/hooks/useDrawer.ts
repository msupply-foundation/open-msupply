import create from 'zustand';

type DrawerController = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
};

const localStorageKey = '@openmsupply-client/appdrawer/open';

export const useDrawer = create<DrawerController>(set => ({
  isOpen: !!JSON.parse(localStorage.getItem(localStorageKey) ?? 'false'),
  open: () => set(state => ({ ...state, isOpen: true })),
  close: () => set(state => ({ ...state, isOpen: false })),
  toggle: () => set(state => ({ ...state, isOpen: !state.isOpen })),
}));

useDrawer.subscribe(({ isOpen }) => {
  localStorage.setItem(localStorageKey, JSON.stringify(isOpen));
});
