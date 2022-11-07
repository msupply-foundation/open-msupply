import React, { FC } from 'react';
import {
  TableProvider,
  DataTable,
  useColumns,
  createTableStore,
  useTranslation,
  NothingHere,
  useUrlQuery,
  useUrlQueryParams,
  useNavigate,
  RouteBuilder,
  DateUtils,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { Toolbar } from '../Components';
import { StockLineRowFragment, useStock } from '../api';

const StockListComponent: FC = () => {
  const { urlQuery, updateQuery } = useUrlQuery({ skipParse: ['filter'] });
  const {
    updatePaginationQuery,
    updateSortQuery,
    queryParams: { sortBy, page, first, offset },
  } = useUrlQueryParams({ initialSort: { key: 'itemName', dir: 'asc' } });
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
      <Toolbar
        onChangeFilter={updateQuery}
        filterString={urlQuery.filter ?? ''}
      />
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
      />
    </>
  );
};

export const StockListView: FC = () => (
  <TableProvider createStore={createTableStore}>
    <StockListComponent />
  </TableProvider>
);
