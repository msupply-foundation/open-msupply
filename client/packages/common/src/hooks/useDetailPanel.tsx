import React from 'react';
import create from 'zustand';
import { LocaleKey } from '../intl/intlHelpers';
import { Button, MenuDots } from '../ui';

type DetailPanelController = {
  actions: Action[];
  isOpen: boolean;
  sections: Section[];
  setActions: (actions: Action[]) => void;
  setSections: (sections: Section[]) => void;
  open: () => void;
  close: () => void;
};

export const useDetailPanelStore = create<DetailPanelController>(set => ({
  actions: [],
  isOpen: false,
  sections: [],
  setActions: (actions: Action[]) => set(state => ({ ...state, actions })),
  setSections: (sections: Section[]) => set(state => ({ ...state, sections })),
  open: () => set(state => ({ ...state, isOpen: true })),
  close: () => set(state => ({ ...state, isOpen: false })),
}));

export type Action = {
  onClick: () => void;
  icon?: JSX.Element;
  titleKey: LocaleKey;
};

export type Section = {
  children: JSX.Element[];
  titleKey: LocaleKey;
};

interface DetailPanel {
  OpenButton: JSX.Element | null;
  setActions: (actions: Action[]) => void;
  setSections: (sections: Section[]) => void;
}
export const useDetailPanel = (): DetailPanel => {
  const { isOpen, open, setActions, setSections } = useDetailPanelStore();

  const OpenButton = isOpen ? null : (
    <Button icon={<MenuDots />} labelKey="button.more" onClick={() => open()} />
  );

  return { OpenButton, setActions, setSections };
};
