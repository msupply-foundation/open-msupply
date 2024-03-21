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
  useToggle,
  NothingHere,
  useUrlQueryParams,
  ColumnFormat,
} from '@openmsupply-client/common';
import { Toolbar } from './Toolbar';
import { AppBarButtons } from './AppBarButtons';
import { getStocktakeTranslator, isStocktakeDisabled } from '../../utils';
import { StocktakeRowFragment } from '../api/operations.generated';
import { useStocktake } from '../api';

const useDisableStocktakeRows = (rows?: StocktakeRowFragment[]) => {
  const { setDisabledRows } = useTableStore();
  useEffect(() => {
    const disabledRows = rows?.filter(isStocktakeDisabled).map(({ id }) => id);
    if (disabledRows) setDisabledRows(disabledRows);
  }, [rows]);
};

export const StocktakeListView: FC = () => {
  const navigate = useNavigate();
  const t = useTranslation('inventory');
  const modalController = useToggle();

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
      ['stocktakeNumber', { maxWidth: 75, sortable: false }],
      [
        'status',
        {
          formatter: status => statusTranslator(status as StocktakeNodeStatus),
        },
      ],
      ['description', { sortable: false }],
      ['createdDatetime', { format: ColumnFormat.Date }],
      ['stocktakeDate', { sortable: false }],
      ['comment', { sortable: false }],
      'selection',
    ],
    { onChangeSortBy: updateSortQuery, sortBy },
    [sortBy]
  );

  return (
    <>
      <Toolbar filter={filter} />
      <AppBarButtons modalController={modalController} />

      <DataTable
        id="stocktake-list"
        pagination={{ ...pagination, total: data?.totalCount ?? 0 }}
        onChangePage={updatePaginationQuery}
        columns={columns}
        data={data?.nodes ?? []}
        isError={isError}
        isLoading={isLoading}
        onRowClick={row => {
          navigate(String(row.stocktakeNumber));
        }}
        noDataElement={
          <NothingHere
            body={t('error.no-stocktakes')}
            onCreate={modalController.toggleOn}
          />
        }
      />
    </>
  );
};

export const ListView: FC = () => (
  <TableProvider createStore={createTableStore}>
    <StocktakeListView />
  </TableProvider>
);
