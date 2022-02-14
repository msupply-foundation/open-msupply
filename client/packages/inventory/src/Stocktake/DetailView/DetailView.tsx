import React, { FC } from 'react';
import {
  TableProvider,
  createTableStore,
  Item,
  useEditModal,
  DetailViewSkeleton,
  AlertModal,
  RouteBuilder,
  useNavigate,
  useTranslation,
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
import { AppRoute } from '@openmsupply-client/config';

export const DetailView: FC = () => {
  const { isOpen, entity, onOpen, onClose, mode } = useEditModal<Item>();
  const { data, isLoading } = useStocktake();
  const navigate = useNavigate();
  const t = useTranslation('inventory');

  const onRowClick = (item: StocktakeLine | StocktakeSummaryItem) => {
    onOpen(toItem(item));
  };

  if (isLoading) return <DetailViewSkeleton hasGroupBy={true} hasHold={true} />;

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
    <AlertModal
      open={true}
      onOk={() =>
        navigate(
          RouteBuilder.create(AppRoute.Inventory)
            .addPart(AppRoute.Stocktakes)
            .build()
        )
      }
      title={t('error.stocktake-not-found')}
      message={t('messages.click-to-return')}
    />
  );
};
