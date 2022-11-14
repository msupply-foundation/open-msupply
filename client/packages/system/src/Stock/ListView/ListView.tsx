import React, { FC } from 'react';
import {
  TableProvider,
  DataTable,
  useColumns,
  createTableStore,
  useTranslation,
  NothingHere,
  useUrlQueryParams,
  useNavigate,
  RouteBuilder,
  DateUtils,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { Toolbar } from '../Components';
import { StockLineRowFragment, useStock } from '../api';

const StockListComponent: FC = () => {
  const {
    filter,
    updatePaginationQuery,
    updateSortQuery,
    queryParams: { sortBy, page, first, offset },
  } = useUrlQueryParams({
    initialSort: { key: 'expiryDate', dir: 'asc' },
    filterKey: 'itemCodeOrName',
  });
  const pagination = { page, first, offset };
  const t = useTranslation('inventory');
  const navigate = useNavigate();

  const { data, isLoading, isError } = useStock.document.list();

  const columns = useColumns<StockLineRowFragment>(
    [
      [
        'itemCode',
        { accessor: ({ rowData }) => rowData.item.code, sortable: false },
      ],
      [
        'itemName',
        { accessor: ({ rowData }) => rowData.item.name, sortable: false },
      ],
      ['batch', { sortable: false }],
      [
        'expiryDate',
        {
          accessor: ({ rowData }) =>
            DateUtils.getDateOrNull(rowData.expiryDate),
        },
      ],
      ['locationName', { sortable: false }],
      [
        'itemUnit',
        { accessor: ({ rowData }) => rowData.item.unitName, sortable: false },
      ],
      ['packSize', { sortable: false }],
      [
        'numberOfPacks',
        {
          accessor: ({ rowData }) => rowData.totalNumberOfPacks,
          width: 150,
        },
      ],
      [
        'stockOnHand',
        {
          accessor: ({ rowData }) =>
            rowData.totalNumberOfPacks * rowData.packSize,
          label: 'label.soh',
          description: 'description.soh',
          sortable: false,
          width: 125,
        },
      ],
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
        id="stock-list"
        pagination={{ ...pagination, total: data?.totalCount ?? 0 }}
        columns={columns}
        data={data?.nodes ?? []}
        onChangePage={updatePaginationQuery}
        noDataElement={<NothingHere body={t('error.no-stock')} />}
        isError={isError}
        isLoading={isLoading}
        onRowClick={row => {
          navigate(
            RouteBuilder.create(AppRoute.Catalogue)
              .addPart(AppRoute.Items)
              .addPart(row.itemId)
              .build()
          );
        }}
        enableColumnSelection
      />
    </>
  );
};

export const StockListView: FC = () => (
  <TableProvider createStore={createTableStore}>
    <StockListComponent />
  </TableProvider>
);
