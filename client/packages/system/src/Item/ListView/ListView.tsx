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
  RouteBuilder,
} from '@openmsupply-client/common';
import { useItems, ItemsWithStatsFragment } from '../api';
import { Toolbar } from './Toolbar';
import { PackVariantQuantityCell, PackVariantSelectCell } from '../Components';
import { AppRoute } from '@openmsupply-client/config';

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
  const queryParams = { sortBy, page, first, offset };
  const { data, isError, isLoading } = useItems(queryParams);
  const pagination = { page, first, offset };
  const navigate = useNavigate();
  const t = useTranslation('catalogue');

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
        Cell: PackVariantSelectCell({
          getItemId: r => r.id,
          getUnitName: r => r.unitName || null,
        }),
        width: 130,
        sortable: false,
      },
      [
        'stockOnHand',
        {
          Cell: PackVariantQuantityCell({
            getItemId: r => r.id,
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
          Cell: PackVariantQuantityCell({
            getItemId: r => r.id,
            getQuantity: r => r.stats.averageMonthlyConsumption,
          }),
          align: ColumnAlign.Right,
          sortable: false,
          width: 100,
        },
      ],
      {
        Cell: PackVariantQuantityCell({
          getItemId: r => r.id,
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
          navigate(
            RouteBuilder.create(AppRoute.Catalogue)
              .addPart(AppRoute.Items)
              .addPart(row.id)
              .build()
          );
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
