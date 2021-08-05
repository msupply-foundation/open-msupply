import { useLocalStorageSync } from './useLocalStorageSync';

interface DrawerState {
  isOpen: boolean;
  close: () => void;
  open: () => void;
}

export const useDrawer = (): DrawerState => {
  const { value, setItem } = useLocalStorageSync<boolean>(
    '@openmsupply-client/appdrawer/open'
  );

  return {
    isOpen: !!value,
    close() {
      setItem(false);
    },
    open() {
      setItem(true);
    },
  };
};
