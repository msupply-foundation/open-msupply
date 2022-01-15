import React, { FC } from 'react';
import {
  TableProvider,
  createTableStore,
  Item,
  useEditModal,
} from '@openmsupply-client/common';
import { toItem } from '@openmsupply-client/system';
import { ContentArea } from './ContentArea';
import { ItemDetailsModal } from './modals/ItemDetailsModal';
import { InvoiceItem, InvoiceLine } from '../../types';
import { Toolbar } from './Toolbar';
import { Footer } from './Footer';
import { AppBarButtons } from './AppBarButtons';
import { SidePanel } from './SidePanel';

export const DetailView: FC = () => {
  const { entity, mode, onOpen, onClose, isOpen } = useEditModal<Item>();

  const onRowClick = (item: InvoiceLine | InvoiceItem) => {
    onOpen(toItem(item));
  };

  return (
    <TableProvider createStore={createTableStore}>
      <AppBarButtons onAddItem={() => onOpen()} />

      {isOpen && (
        <ItemDetailsModal
          item={entity}
          mode={mode}
          isOpen={isOpen}
          onClose={onClose}
        />
      )}

      <Toolbar />
      <ContentArea onRowClick={onRowClick} />
      <Footer />
      <SidePanel />
    </TableProvider>
  );
};
