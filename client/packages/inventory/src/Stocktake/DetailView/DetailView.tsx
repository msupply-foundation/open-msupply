import React, { FC, useCallback } from 'react';
import {
  TableProvider,
  createTableStore,
  useEditModal,
  DetailViewSkeleton,
  AlertModal,
  RouteBuilder,
  useNavigate,
  useTranslation,
  createQueryParamsStore,
} from '@openmsupply-client/common';
import { ItemRowFragment } from '@openmsupply-client/system';
import { Toolbar } from './Toolbar';
import { Footer } from './Footer';
import { AppBarButtons } from './AppBarButtons';
import { SidePanel } from './SidePanel';
import { StocktakeSummaryItem } from '../../types';

import { StocktakeLineEdit } from './modal/StocktakeLineEdit';
import { ContentArea } from './ContentArea';
import { AppRoute } from '@openmsupply-client/config';
import { StocktakeLineFragment, useStocktake } from '../api';

export const DetailView: FC = () => {
  const isDisabled = useStocktake.utils.isDisabled();
  const { isOpen, entity, onOpen, onClose, mode } =
    useEditModal<ItemRowFragment>();
  const { data, isLoading } = useStocktake.document.get();
  const navigate = useNavigate();
  const t = useTranslation('inventory');

  const onRowClick = useCallback(
    (item: StocktakeLineFragment | StocktakeSummaryItem) => {
      if (item.item) onOpen(item.item);
    },
    [onOpen]
  );

  if (isLoading) return <DetailViewSkeleton hasGroupBy={true} hasHold={true} />;

  return !!data ? (
    <TableProvider
      createStore={createTableStore}
      queryParamsStore={createQueryParamsStore<
        StocktakeLineFragment | StocktakeSummaryItem
      >({
        initialSortBy: { key: 'itemName' },
      })}
    >
      <AppBarButtons onAddItem={() => onOpen()} />
      <Toolbar />

      <ContentArea
        onRowClick={!isDisabled ? onRowClick : null}
        onAddItem={() => onOpen()}
      />
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
