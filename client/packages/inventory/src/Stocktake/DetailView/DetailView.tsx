import React, { FC } from 'react';
import { useParams } from 'react-router';
import {
  TableProvider,
  createTableStore,
  useOmSupplyApi,
  useDocument,
  useColumns,
  GenericColumnKey,
  DataTable,
  usePagination,
  useTranslation,
} from '@openmsupply-client/common';
import { reducer } from './reducer';
import { getStocktakeDetailViewApi } from './api';
import { Toolbar } from './Toolbar';
import { Footer } from './Footer';
import { AppBarButtons } from './AppBarButtons';
import { SidePanel } from './SidePanel';
import { isStocktakeEditable } from '../../utils';
import { StocktakeItem } from '../../types';

const useDraftStocktake = () => {
  const { id } = useParams();
  const { api } = useOmSupplyApi();

  const { draft, save, dispatch, state } = useDocument(
    ['stocktake', id],
    reducer,
    getStocktakeDetailViewApi(api)
  );

  const onChangeSortBy = () => {};

  return { draft, save, dispatch, onChangeSortBy, sortBy: state.sortBy };
};

export const DetailView: FC = () => {
  const { draft, save, onChangeSortBy, sortBy } = useDraftStocktake();

  const columns = useColumns<StocktakeItem>(
    ['itemCode', 'itemName', GenericColumnKey.Selection],
    { onChangeSortBy, sortBy },
    [sortBy]
  );

  const { pagination } = usePagination();
  const activeRows = draft.lines.filter(({ isDeleted }) => !isDeleted);

  const t = useTranslation('common');

  return (
    <TableProvider createStore={createTableStore}>
      <AppBarButtons
        isDisabled={!isStocktakeEditable(draft)}
        onAddItem={() => {}}
      />
      <Toolbar draft={draft} />
      <DataTable
        pagination={{ ...pagination, total: activeRows.length }}
        columns={columns}
        data={activeRows.slice(
          pagination.offset,
          pagination.offset + pagination.first
        )}
        onChangePage={pagination.onChangePage}
        noDataMessage={t('error.no-items')}
      />
      <Footer draft={draft} save={save} />
      <SidePanel draft={draft} />
    </TableProvider>
  );
};
