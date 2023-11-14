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
  NumUtils,
} from '@openmsupply-client/common';
import { useItems, ItemsWithStatsFragment } from '../api';
import { Toolbar } from './Toolbar';
import { PackVariantQuantityCell, PackVariantSelectCell } from '../Components';

const ItemListComponent: FC = () => {
  const {
    filter,
    updateSortQuery,
    updatePaginationQuery,
    queryParams: { sortBy, page, first, offset },
  } = useUrlQueryParams({
    initialSort: { key: 'name', dir: 'asc' },
    filterKey: 'codeOrName',
  });
  const { data, isError, isLoading } = useItems();
  const pagination = { page, first, offset };
  const navigate = useNavigate();
  const t = useTranslation('catalogue');

  const columns = useColumns<ItemsWithStatsFragment>(
    [
      'code',
      'name',
      {
        key: 'packUnit',
        label: 'label.pack',
        align: ColumnAlign.Right,
        Cell: PackVariantSelectCell({
          getItemId: r => r.id,
          getUnitName: r => r.unitName || null,
        }),
      },
      [
        'stockOnHand',
        {
          Cell: PackVariantQuantityCell({
            getItemId: r => r.id,
            getQuantity: r => NumUtils.round(r.stats.availableStockOnHand),
          }),
          label: 'label.soh',
          description: 'description.soh',
          sortable: false,
        },
      ],
      [
        'monthlyConsumption',
        {
          Cell: PackVariantQuantityCell({
            getItemId: r => r.id,
            getQuantity: r =>
              NumUtils.round(r.stats.averageMonthlyConsumption, 2),
          }),
          align: ColumnAlign.Right,
          sortable: false,
        },
      ],
      {
        Cell: PackVariantQuantityCell({
          getItemId: r => r.id,
          getQuantity: r =>
            NumUtils.round(r.stats.availableMonthsOfStockOnHand ?? 0, 2),
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
        pagination={{ ...pagination, total: data?.totalCount }}
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
