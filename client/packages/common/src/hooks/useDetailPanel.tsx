import React from 'react';
import create from 'zustand';
import { LocaleKey } from '../intl/intlHelpers';
import { Button, MenuDots } from '../ui';

type DetailPanelController = {
  isOpen: boolean;
  sections: Section[];
  setSections: (sections: Section[]) => void;
  open: () => void;
  close: () => void;
};

export const useDetailPanelStore = create<DetailPanelController>(set => ({
  isOpen: false,
  sections: [],
  setSections: (sections: Section[]) => set(state => ({ ...state, sections })),
  open: () => set(state => ({ ...state, isOpen: true })),
  close: () => set(state => ({ ...state, isOpen: false })),
}));

type Section = {
  children: JSX.Element[];
  titleKey: LocaleKey;
};

interface DetailPanel {
  OpenButton: JSX.Element | null;
  setSections: (sections: Section[]) => void;
}
export const useDetailPanel = (): DetailPanel => {
  const { isOpen, open, setSections } = useDetailPanelStore();

  const OpenButton = isOpen ? null : (
    <Button icon={<MenuDots />} labelKey="button.more" onClick={() => open()} />
  );

  return { OpenButton, setSections };
};
