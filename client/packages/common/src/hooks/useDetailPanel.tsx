import React from 'react';
import create from 'zustand';
import { useTranslation } from '@common/intl';
import { SidebarIcon, ButtonWithIcon } from '../ui';
import LocalStorage from '../localStorage/LocalStorage';

type DetailPanelController = {
  hasUserSet: boolean;
  isOpen: boolean;
  open: () => void;
  close: () => void;
};

export const useDetailPanelStore = create<DetailPanelController>(set => {
  const initialValue = LocalStorage.getItem('/detailpanel/open');

  return {
    hasUserSet: initialValue !== null,
    isOpen: !!initialValue,
    open: () => set(state => ({ ...state, isOpen: true, hasUserSet: true })),
    close: () => set(state => ({ ...state, isOpen: false, hasUserSet: true })),
  };
});

interface DetailPanel {
  OpenButton: JSX.Element | null;
  open: () => void;
  close: () => void;
}
export const useDetailPanel = (): DetailPanel => {
  const t = useTranslation('common');
  const { isOpen, open, close } = useDetailPanelStore();
  const OpenButton = isOpen ? null : (
    <ButtonWithIcon
      Icon={<SidebarIcon />}
      label={t('button.more')}
      onClick={open}
    />
  );

  return { OpenButton, open, close };
};

useDetailPanelStore.subscribe(({ hasUserSet, isOpen }) => {
  if (hasUserSet) LocalStorage.setItem('/detailpanel/open', isOpen);
});

LocalStorage.addListener<boolean>((key, value) => {
  if (key === '/detailpanel/open') {
    useDetailPanelStore.setState(state => ({ ...state, isOpen: value }));
  }
});
