import React, { FC } from 'react';
import {
  useNavigate,
  StocktakeNodeStatus,
  DataTable,
  useColumns,
  TableProvider,
  createTableStore,
  useTranslation,
} from '@openmsupply-client/common';
import { Toolbar } from './Toolbar';
import { AppBarButtons } from './AppBarButtons';
import { getStocktakeTranslator } from '../../utils';
import { StocktakeRowFragment } from '../api/operations.generated';
import { useStocktakes } from '../api';

export const StocktakeListView: FC = () => {
  const navigate = useNavigate();
  const t = useTranslation(['common', 'inventory']);

  const {
    data,
    isLoading,
    sortBy,
    onChangeSortBy,
    onChangePage,
    pagination,
    filter,
  } = useStocktakes();

  const statusTranslator = getStocktakeTranslator(t);

  const columns = useColumns<StocktakeRowFragment>(
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

  return (
    <>
      <Toolbar data={data?.nodes} filter={filter} />
      <AppBarButtons />

      <DataTable
        pagination={{ ...pagination, total: data?.totalCount }}
        onChangePage={onChangePage}
        columns={columns}
        data={data?.nodes ?? []}
        isLoading={isLoading}
        onRowClick={row => {
          navigate(String(row.stocktakeNumber));
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
