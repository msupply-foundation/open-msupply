import React, { FC, useEffect } from 'react';
import {
  useNavigate,
  StocktakeNodeStatus,
  DataTable,
  useColumns,
  TableProvider,
  createTableStore,
  useTranslation,
  useTableStore,
} from '@openmsupply-client/common';
import { Toolbar } from './Toolbar';
import { AppBarButtons } from './AppBarButtons';
import { getStocktakeTranslator, isStocktakeDisabled } from '../../utils';
import { StocktakeRowFragment } from '../api/operations.generated';
import { useStocktakes } from '../api';

const useDisableStocktakeRows = (rows?: StocktakeRowFragment[]) => {
  const { setDisabledRows } = useTableStore();
  useEffect(() => {
    const disabledRows = rows?.filter(isStocktakeDisabled).map(({ id }) => id);
    if (disabledRows) setDisabledRows(disabledRows);
  }, [rows]);
};

export const StocktakeListView: FC = () => {
  const navigate = useNavigate();
  const t = useTranslation(['common', 'inventory']);

  const {
    data,
    isError,
    isLoading,
    sortBy,
    onChangeSortBy,
    onChangePage,
    pagination,
    filter,
  } = useStocktakes();
  useDisableStocktakeRows(data?.nodes);

  const statusTranslator = getStocktakeTranslator(t);

  const columns = useColumns<StocktakeRowFragment>(
    [
      ['stocktakeNumber', { maxWidth: 50, sortable: false }],
      [
        'status',
        {
          formatter: status => statusTranslator(status as StocktakeNodeStatus),
        },
      ],
      ['description', { sortable: false }],
      'createdDatetime',
      ['stocktakeDate', { sortable: false }],
      ['comment', { sortable: false }],
      'selection',
    ],
    { onChangeSortBy, sortBy },
    [sortBy]
  );

  return (
    <>
      <Toolbar filter={filter} />
      <AppBarButtons sortBy={sortBy} />

      <DataTable
        pagination={{ ...pagination, total: data?.totalCount }}
        onChangePage={onChangePage}
        columns={columns}
        data={data?.nodes ?? []}
        isError={isError}
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
