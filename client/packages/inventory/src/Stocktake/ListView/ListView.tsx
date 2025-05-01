import React, { FC, useEffect } from 'react';
import {
  useNavigate,
  DataTable,
  useColumns,
  TableProvider,
  createTableStore,
  useTranslation,
  useTableStore,
  NothingHere,
  useUrlQueryParams,
  ColumnFormat,
  GenericColumnKey,
  getCommentPopoverColumn,
} from '@openmsupply-client/common';
import { Toolbar } from './Toolbar';
import { AppBarButtons } from './AppBarButtons';
import { getStocktakeTranslator, isStocktakeDisabled } from '../../utils';
import { StocktakeRowFragment } from '../api/operations.generated';
import { useStocktake } from '../api';
import { Footer } from './Footer';
import { useCreateStocktake } from './createStocktake';

const useDisableStocktakeRows = (rows?: StocktakeRowFragment[]) => {
  const { setDisabledRows } = useTableStore();
  useEffect(() => {
    const disabledRows = rows?.filter(isStocktakeDisabled).map(({ id }) => id);
    if (disabledRows) setDisabledRows(disabledRows);
  }, [rows]);
};

export const StocktakeListView: FC = () => {
  const navigate = useNavigate();
  const t = useTranslation();
  const { createStocktake } = useCreateStocktake();

  const {
    updateSortQuery,
    updatePaginationQuery,
    filter,
    queryParams: { sortBy, page, first, offset },
  } = useUrlQueryParams();
  const { data, isError, isLoading } = useStocktake.document.list();
  const pagination = { page, first, offset };
  useDisableStocktakeRows(data?.nodes);

  const statusTranslator = getStocktakeTranslator(t);

  const columns = useColumns<StocktakeRowFragment>(
    [
      GenericColumnKey.Selection,
      ['stocktakeNumber', { maxWidth: 75, sortable: false }],
      [
        'status',
        {
          accessor: ({ rowData }) =>
            rowData.isLocked
              ? t('label.stocktake-on-hold')
              : statusTranslator(rowData.status),
        },
      ],
      ['description', { sortable: false }],
      ['createdDatetime', { format: ColumnFormat.Date }],
      ['stocktakeDate', { sortable: false }],
      getCommentPopoverColumn(),
    ],
    { onChangeSortBy: updateSortQuery, sortBy },
    [sortBy]
  );

  const createInitialStocktake = () => {
    const comment = t('stocktake.comment-initial-stocktake-template');
    const input = {
      comment,
      isInitialStocktake: true,
    };
    createStocktake(input);
  };

  return (
    <>
      <Toolbar filter={filter} />
      <AppBarButtons />
      <DataTable
        id="stocktake-list"
        pagination={{ ...pagination, total: data?.totalCount ?? 0 }}
        onChangePage={updatePaginationQuery}
        columns={columns}
        data={data?.nodes ?? []}
        isError={isError}
        isLoading={isLoading}
        onRowClick={row => {
          navigate(String(row.id));
        }}
        noDataElement={
          <NothingHere
            body={t('error.no-stocktakes')}
            onCreate={createInitialStocktake}
          />
        }
      />
      <Footer />
    </>
  );
};

export const ListView: FC = () => (
  <TableProvider createStore={createTableStore}>
    <StocktakeListView />
  </TableProvider>
);
