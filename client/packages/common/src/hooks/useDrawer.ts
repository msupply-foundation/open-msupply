import create from 'zustand';

const localStorageKey = '@openmsupply-client/appdrawer/open';

type DrawerController = {
  isOpen: boolean;
  hasUserSet: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
};

export const useDrawer = create<DrawerController>(set => ({
  hasUserSet: localStorage.getItem(localStorageKey) !== null,
  isOpen: !!JSON.parse(localStorage.getItem(localStorageKey) ?? 'false'),
  open: () => set(state => ({ ...state, isOpen: true })),
  close: () => set(state => ({ ...state, isOpen: false })),
  toggle: () =>
    set(state => ({ ...state, isOpen: !state.isOpen, hasUserSet: true })),
}));

useDrawer.subscribe(({ hasUserSet, isOpen }) => {
  if (hasUserSet) localStorage.setItem(localStorageKey, JSON.stringify(isOpen));
});
