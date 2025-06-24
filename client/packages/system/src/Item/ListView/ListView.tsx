import React from 'react';
import {
  useNavigate,
  TableProvider,
  DataTable,
  useColumns,
  createTableStore,
  NothingHere,
  useTranslation,
  useUrlQueryParams,
  ColumnAlign,
  TooltipTextCell,
} from '@openmsupply-client/common';
import { useItems, ItemsWithStatsFragment } from '../api';
import { Toolbar } from './Toolbar';
import { PackQuantityCell } from '../Components';

const ItemListComponent = () => {
  const t = useTranslation();
  const navigate = useNavigate();
  const {
    filter,
    updateSortQuery,
    updatePaginationQuery,
    queryParams: { sortBy, page, first, offset },
  } = useUrlQueryParams({
    initialSort: { key: 'name', dir: 'asc' },
    filters: [{ key: 'codeOrName' }],
  });
  const { data, isError, isLoading } = useItems();
  const pagination = { page, first, offset };

  const columns = useColumns<ItemsWithStatsFragment>(
    [
      ['code', { width: 75 }],
      [
        'name',
        {
          Cell: TooltipTextCell,
          maxWidth: 350,
        },
      ],
      {
        key: 'packUnit',
        label: 'label.unit',
        align: ColumnAlign.Right,
        accessor: ({ rowData }) => rowData.unitName,
        width: 130,
        sortable: false,
      },
      [
        'stockOnHand',
        {
          accessor: ({ rowData }) => rowData.stats.stockOnHand,
          Cell: PackQuantityCell,
          sortable: false,
        },
      ],
      [
        'monthlyConsumption',
        {
          Cell: PackQuantityCell,
          accessor: ({ rowData }) => rowData.stats.averageMonthlyConsumption,

          align: ColumnAlign.Right,
          sortable: false,
          width: 100,
        },
      ],
      {
        Cell: PackQuantityCell,
        accessor: ({ rowData }) => rowData.stats.monthsOfStockOnHand ?? 0,
        align: ColumnAlign.Right,
        description: 'description.months-of-stock',
        key: 'monthsOfStockOnHand',
        label: 'label.months-of-stock',
        sortable: false,
        width: 100,
      },
    ],
    {
      sortBy,
      onChangeSortBy: updateSortQuery,
    },
    [sortBy]
  );

  return (
    <>
      <Toolbar filter={filter} />
      <DataTable
        id="item-list"
        pagination={{ ...pagination, total: data?.totalCount ?? 0 }}
        onChangePage={updatePaginationQuery}
        columns={columns}
        data={data?.nodes}
        isError={isError}
        isLoading={isLoading}
        onRowClick={row => {
          navigate(`/catalogue/items/${row.id}`);
        }}
        noDataElement={<NothingHere body={t('error.no-items-to-display')} />}
      />
    </>
  );
};

export const ItemListView = () => (
  <TableProvider createStore={createTableStore}>
    <ItemListComponent />
  </TableProvider>
);
