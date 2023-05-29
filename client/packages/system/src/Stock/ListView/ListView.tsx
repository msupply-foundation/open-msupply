import React, { FC } from 'react';
import {
  TableProvider,
  DataTable,
  useColumns,
  createTableStore,
  useTranslation,
  NothingHere,
  useUrlQueryParams,
  DateUtils,
  useTableStore,
} from '@openmsupply-client/common';
import { Toolbar } from '../Components';
import { StockLineRowFragment, useStock } from '../api';
import { AppBarButtons } from './AppBarButtons';

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
  const { data, isLoading, isError } = useStock.line.list();
  const columns = useColumns<StockLineRowFragment>(
    [
      'selectOne',
      ['itemCode', { accessor: ({ rowData }) => rowData.item.code }],
      ['itemName', { accessor: ({ rowData }) => rowData.item.name }],
      'batch',
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
      'packSize',
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
      {
        key: 'supplierName',
        label: 'label.supplier',
        accessor: ({ rowData }) =>
          rowData.supplierName
            ? rowData.supplierName
            : t('message.no-supplier'),
      },
    ],
    {
      sortBy,
      onChangeSortBy: updateSortQuery,
    },
    [sortBy]
  );

  const selected = useTableStore(
    state =>
      data?.nodes.filter(({ id }) => state.rowState[id]?.isSelected).shift() ??
      null
  );

  return (
    <>
      <Toolbar filter={filter} />
      <AppBarButtons selected={selected} />
      <DataTable
        id="stock-list"
        pagination={{ ...pagination, total: data?.totalCount ?? 0 }}
        columns={columns}
        data={data?.nodes ?? []}
        onChangePage={updatePaginationQuery}
        noDataElement={<NothingHere body={t('error.no-stock')} />}
        isError={isError}
        isLoading={isLoading}
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
