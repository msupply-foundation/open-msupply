import React, { FC } from 'react';
import {
  TableProvider,
  createTableStore,
  Item,
  useEditModal,
  DetailViewSkeleton,
} from '@openmsupply-client/common';
import { toItem } from '@openmsupply-client/system';
import { Toolbar } from './Toolbar';
import { Footer } from './Footer';
import { AppBarButtons } from './AppBarButtons';
import { SidePanel } from './SidePanel';
import { StocktakeLine, StocktakeSummaryItem } from '../../types';

import { StocktakeLineEdit } from './modal/StocktakeLineEdit';
import { ContentArea } from './ContentArea';
import { useStocktake } from '../api/hooks';

export const DetailView: FC = () => {
  const { isOpen, entity, onOpen, onClose, mode } = useEditModal<Item>();
  const { data } = useStocktake();

  const onRowClick = (item: StocktakeLine | StocktakeSummaryItem) => {
    onOpen(toItem(item));
  };

  return !!data ? (
    <TableProvider createStore={createTableStore}>
      <AppBarButtons onAddItem={() => onOpen()} />
      <Toolbar />

      <ContentArea onRowClick={onRowClick} />
      <Footer />
      <SidePanel />

      {isOpen && (
        <StocktakeLineEdit
          isOpen={isOpen}
          onClose={onClose}
          mode={mode}
          item={entity}
        />
      )}
    </TableProvider>
  ) : (
    <DetailViewSkeleton hasGroupBy={true} hasHold={true} />
  );
};
