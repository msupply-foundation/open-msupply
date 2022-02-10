import React, { FC, useCallback } from 'react';
import {
  TableProvider,
  createTableStore,
  Item,
  useEditModal,
  DetailViewSkeleton,
} from '@openmsupply-client/common';
import { toItem } from '@openmsupply-client/system';
import { ContentArea } from './ContentArea';
import { OutboundLineEdit } from './modals/OutboundLineEdit';
import { InvoiceItem, InvoiceLine } from '../../types';
import { Toolbar } from './Toolbar';
import { Footer } from './Footer';
import { AppBarButtons } from './AppBarButtons';
import { SidePanel } from './SidePanel';
import { useOutbound } from '../api';

export const DetailView: FC = () => {
  const { entity, mode, onOpen, onClose, isOpen } = useEditModal<Item>();
  const { data } = useOutbound();

  const onRowClick = useCallback(
    (item: InvoiceLine | InvoiceItem) => {
      onOpen(toItem(item));
    },
    [toItem, onOpen]
  );

  return (
    <React.Suspense
      fallback={<DetailViewSkeleton hasGroupBy={true} hasHold={true} />}
    >
      {data && data.id ? (
        <TableProvider createStore={createTableStore}>
          <AppBarButtons onAddItem={() => onOpen()} />
          {isOpen && (
            <OutboundLineEdit
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
      ) : (
        <DetailViewSkeleton hasGroupBy={true} hasHold={true} />
      )}
    </React.Suspense>
  );
};
