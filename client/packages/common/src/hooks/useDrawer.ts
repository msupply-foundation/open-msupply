import create from 'zustand';

const localStorageKey = '@openmsupply-client/appdrawer/open';

type DrawerController = {
  isOpen: boolean;
  isSet: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
};

export const useDrawer = create<DrawerController>(set => ({
  isOpen: !!JSON.parse(localStorage.getItem(localStorageKey) ?? 'false'),
  isSet: localStorage.getItem(localStorageKey) !== null,
  open: () => set(state => ({ ...state, isOpen: true })),
  close: () => set(state => ({ ...state, isOpen: false })),
  toggle: () => set(state => ({ ...state, isOpen: !state.isOpen })),
}));

useDrawer.subscribe(({ isOpen }) => {
  localStorage.setItem(localStorageKey, JSON.stringify(isOpen));
});
