import { useLocalStorageSync } from './useLocalStorageSync';

interface DrawerController {
  open: boolean;
  closeDrawer: () => void;
  openDrawer: () => void;
}

export const useDrawer = (): DrawerController => {
  const { value, setItem } = useLocalStorageSync<boolean>(
    '@openmsupply-client/appdrawer/open'
  );

  return {
    open: !!value,
    closeDrawer() {
      setItem(false);
    },
    openDrawer() {
      setItem(true);
    },
  };
};
