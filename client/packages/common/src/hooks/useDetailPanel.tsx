import React from 'react';
import create from 'zustand';
import { SidebarIcon, ButtonWithIcon } from '../ui';

type DetailPanelController = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
};

export const useDetailPanelStore = create<DetailPanelController>(set => ({
  isOpen: false,
  open: () => set(state => ({ ...state, isOpen: true })),
  close: () => set(state => ({ ...state, isOpen: false })),
}));

interface DetailPanel {
  OpenButton: JSX.Element | null;
  open: () => void;
  close: () => void;
}
export const useDetailPanel = (): DetailPanel => {
  const { isOpen, open, close } = useDetailPanelStore();
  const OpenButton = isOpen ? null : (
    <ButtonWithIcon
      Icon={<SidebarIcon />}
      labelKey="button.more"
      onClick={open}
    />
  );

  return { OpenButton, open, close };
};
