import React, { FC } from 'react';
import { useNavigate } from 'react-router';
import {
  StocktakeNodeStatus,
  DataTable,
  useColumns,
  useListData,
  TableProvider,
  createTableStore,
  useNotification,
  generateUUID,
  useOmSupplyApi,
  useTranslation,
} from '@openmsupply-client/common';
import { Toolbar } from './Toolbar';
import { AppBarButtons } from './AppBarButtons';
import { getStocktakeListViewApi } from './api';
import { StocktakeRow } from '../../types';
import { getStocktakeTranslator } from '../../utils';

export const StocktakeListView: FC = () => {
  const navigate = useNavigate();
  const { error } = useNotification();
  const { api } = useOmSupplyApi();
  const t = useTranslation(['common', 'inventory']);

  const {
    totalCount,
    data,
    isLoading,
    onDelete,
    sortBy,
    onChangeSortBy,
    onCreate,
    onChangePage,
    pagination,
    filter,
    invalidate,
  } = useListData(
    {
      initialSortBy: { key: 'comment' },
    },
    'invoice',
    getStocktakeListViewApi(api)
  );

  const statusTranslator = getStocktakeTranslator(t);

  const columns = useColumns<StocktakeRow>(
    [
      'stocktakeNumber',
      [
        'status',
        {
          formatter: status => statusTranslator(status as StocktakeNodeStatus),
        },
      ],
      'description',
      'comment',
      'stocktakeDatetime',
      'selection',
    ],
    { onChangeSortBy, sortBy },
    [sortBy]
  );

  const onNewStocktake = async () => {
    try {
      const id = generateUUID();
      const result = await onCreate({ id });
      invalidate();
      navigate(result);
    } catch (e) {
      const errorSnack = error(
        'Failed to create stocktake! ' + (e as Error).message
      );
      errorSnack();
    }
  };

  return (
    <>
      <Toolbar onDelete={onDelete} data={data} filter={filter} />
      <AppBarButtons onCreate={onNewStocktake} />

      <DataTable
        pagination={{ ...pagination, total: totalCount }}
        onChangePage={onChangePage}
        columns={columns}
        data={data ?? []}
        isLoading={isLoading}
        onRowClick={row => {
          navigate(row.id);
        }}
      />
    </>
  );
};

export const ListView: FC = () => {
  return (
    <TableProvider createStore={createTableStore}>
      <StocktakeListView />
    </TableProvider>
  );
};
