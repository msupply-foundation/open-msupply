import React, { FC } from 'react';
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
  useFormatNumber,
  TooltipTextCell,
} from '@openmsupply-client/common';
import { useItems, ItemRowFragment } from '../api';
import { Toolbar } from './Toolbar';

const ItemListComponent: FC = () => {
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
  const navigate = useNavigate();
  const t = useTranslation('catalogue');
  const formatNumber = useFormatNumber();

  type ItemWithStats = ItemRowFragment & {
    stats: {
      averageMonthlyConsumption?: number | null;
      availableStockOnHand?: number | null;
      availableMonthsOfStockOnHand?: number | null;
    };
  };

  const columns = useColumns<ItemWithStats>(
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
        accessor: ({ rowData }) => rowData.unitName ?? '',
        align: ColumnAlign.Right,
        key: 'unitName',
        label: 'label.unit',
        sortable: false,
        width: 100,
      },
      [
        'stockOnHand',
        {
          accessor: ({ rowData }) =>
            formatNumber.round(rowData.stats.availableStockOnHand ?? 0),
          label: 'label.soh',
          description: 'description.soh',
          sortable: false,
        },
      ],
      [
        'monthlyConsumption',
        {
          accessor: ({ rowData }) =>
            formatNumber.round(rowData.stats.averageMonthlyConsumption ?? 0, 2),
          align: ColumnAlign.Right,
          sortable: false,
        },
      ],
      {
        accessor: ({ rowData }) =>
          formatNumber.round(
            rowData.stats.availableMonthsOfStockOnHand ?? 0,
            2
          ),
        align: ColumnAlign.Right,
        description: 'description.months-of-stock',
        key: 'availableMonthsOfStockOnHand',
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
        noDataElement={<NothingHere body={t('error.no-items')} />}
      />
    </>
  );
};

export const ItemListView: FC = () => (
  <TableProvider createStore={createTableStore}>
    <ItemListComponent />
  </TableProvider>
);
