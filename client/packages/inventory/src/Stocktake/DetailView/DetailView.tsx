import React, { FC, useState } from 'react';
import {
  TableProvider,
  createTableStore,
  Item,
  ModalMode,
} from '@openmsupply-client/common';
import { toItem } from '@openmsupply-client/system';
import { Toolbar } from './Toolbar';
import { Footer } from './Footer';
import { AppBarButtons } from './AppBarButtons';
import { SidePanel } from './SidePanel';
import { StocktakeLine, StocktakeSummaryItem } from '../../types';

import { StocktakeLineEdit } from './modal/StocktakeLineEdit';
import { ContentArea } from './ContentArea';

export const DetailView: FC = () => {
  const [modalState, setModalState] = useState<{
    item: Item | null;
    mode: ModalMode;
    isOpen: boolean;
  }>({ item: null, mode: ModalMode.Create, isOpen: false });

  const onRowClick = (item: StocktakeLine | StocktakeSummaryItem) => {
    setModalState({ item: toItem(item), mode: ModalMode.Update, isOpen: true });
  };

  const onAddItem = () => {
    setModalState({ item: null, mode: ModalMode.Create, isOpen: true });
  };

  const onClose = () => {
    setModalState({ item: null, mode: ModalMode.Create, isOpen: false });
  };

  return (
    <TableProvider createStore={createTableStore}>
      <AppBarButtons onAddItem={onAddItem} />
      <Toolbar />

      <ContentArea onRowClick={onRowClick} />
      <Footer />
      <SidePanel />

      {modalState.isOpen && (
        <StocktakeLineEdit
          isOpen={modalState.isOpen}
          onClose={onClose}
          mode={modalState.mode}
          item={modalState.item}
        />
      )}
    </TableProvider>
  );
};
