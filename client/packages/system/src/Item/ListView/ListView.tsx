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
  TooltipTextCell,
} from '@openmsupply-client/common';
import { useItems, ItemsWithStatsFragment } from '../api';
import { Toolbar } from './Toolbar';
import { PackQuantityCell, PackSizeUnitNameCell } from '../Components';

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
  const t = useTranslation();

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
        Cell: PackSizeUnitNameCell({
          getUnitName: r => r.unitName ?? null,
        }),
        width: 130,
        sortable: false,
      },
      [
        'stockOnHand',
        {
          Cell: PackQuantityCell({
            getPackSize: _ => 1, // No pack variants, so we default to pack size of 1
            getQuantity: r => r.stats.availableStockOnHand,
          }),
          label: 'label.soh',
          description: 'description.soh',
          sortable: false,
          width: 100,
        },
      ],
      [
        'monthlyConsumption',
        {
          Cell: PackQuantityCell({
            getPackSize: _ => 1, // No pack variants, so we default to pack size of 1
            getQuantity: r => r.stats.averageMonthlyConsumption,
          }),
          align: ColumnAlign.Right,
          sortable: false,
          width: 100,
        },
      ],
      {
        Cell: PackQuantityCell({
          getPackSize: _ => 1, // No pack variants, so we default to pack size of 1
          getQuantity: r => r.stats.availableMonthsOfStockOnHand ?? 0,
        }),
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
