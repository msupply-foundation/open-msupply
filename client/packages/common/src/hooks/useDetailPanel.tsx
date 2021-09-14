import React from 'react';
import create from 'zustand';
import { Button, MenuDots } from '../ui';

type DetailPanelController = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
};

export const useDetailPanelStore = create<DetailPanelController>(set => ({
  isOpen: false, // TODO: add screen size
  open: () => set(state => ({ ...state, isOpen: true })),
  close: () => set(state => ({ ...state, isOpen: false })),
}));

interface DetailPanel {
  OpenButton: JSX.Element;
}
export const useDetailPanel = (): DetailPanel => {
  const { open } = useDetailPanelStore();
  const OpenButton = (
    <Button icon={<MenuDots />} labelKey="button.more" onClick={() => open()} />
  );

  return { OpenButton };
};
