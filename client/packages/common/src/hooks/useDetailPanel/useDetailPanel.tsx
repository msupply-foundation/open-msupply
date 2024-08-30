import React, { useEffect } from 'react';
import { create } from 'zustand';
import { useTranslation } from '@common/intl';
import { SidebarIcon, ButtonWithIcon } from '../../ui';
import LocalStorage from '../../localStorage/LocalStorage';

type DetailPanelController = {
  hasUserSet: boolean;
  isOpen: boolean;
  shouldPersist: boolean;
  enabled: boolean;
  open: () => void;
  close: () => void;
  setEnabled: (enabled: boolean) => void;
};

export const useDetailPanelStore = create<DetailPanelController>(set => {
  const initialValue = LocalStorage.getItem('/detailpanel/open');

  return {
    enabled: false,
    hasUserSet: initialValue !== null,
    isOpen: false,
    shouldPersist: true,
    open: () =>
      set(state =>
        state.enabled
          ? {
              ...state,
              isOpen: true,
              hasUserSet: true,
              shouldPersist: true,
            }
          : state
      ),
    close: () =>
      set(state =>
        state.enabled
          ? {
              ...state,
              isOpen: false,
              hasUserSet: true,
              shouldPersist: true,
            }
          : state
      ),
    setEnabled: (enabled: boolean) => set(state => ({ ...state, enabled })),
  };
});

interface DetailPanel {
  OpenButton: JSX.Element | null;
  open: () => void;
  close: () => void;
}
export const useDetailPanel = (): DetailPanel => {
  const t = useTranslation();
  const { isOpen, open, close, setEnabled } = useDetailPanelStore();
  const OpenButton = isOpen ? null : (
    <ButtonWithIcon
      Icon={<SidebarIcon />}
      label={t('button.more')}
      onClick={open}
    />
  );

  useEffect(() => {
    setEnabled(true);
    return () => setEnabled(false);
  }, []);

  return { OpenButton, open, close };
};

useDetailPanelStore.subscribe(({ hasUserSet, isOpen, shouldPersist }) => {
  if (hasUserSet && shouldPersist)
    LocalStorage.setItem('/detailpanel/open', isOpen);
});

LocalStorage.addListener<boolean>((key, value) => {
  if (key === '/detailpanel/open') {
    useDetailPanelStore.setState(state => ({ ...state, isOpen: value }));
  }
});
