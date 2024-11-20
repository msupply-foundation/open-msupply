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
  ColumnDescription,
  usePluginColumns,
  TooltipTextCell,
  useNavigate,
  RouteBuilder,
} from '@openmsupply-client/common';
import { StockLineRowFragment } from '../api';
import { AppBarButtons } from './AppBarButtons';
import { Toolbar } from './Toolbar';
import { AppRoute } from '@openmsupply-client/config';
import { useStockList } from '../api/hooks/useStockList';

const StockListComponent: FC = () => {
  const {
    filter,
    updatePaginationQuery,
    updateSortQuery,
    queryParams: { sortBy, page, first, offset, filterBy },
  } = useUrlQueryParams({
    initialSort: { key: 'expiryDate', dir: 'asc' },
    filters: [
      { key: 'itemCodeOrName' },
      {
        key: 'location.code',
      },
      {
        key: 'expiryDate',
        condition: 'between',
      },
    ],
  });
  const navigate = useNavigate();
  const queryParams = {
    filterBy,
    offset,
    sortBy,
    first,
  };

  const pagination = { page, first, offset };
  const t = useTranslation();
  const { data, isLoading, isError } = useStockList(queryParams);
  const pluginColumns = usePluginColumns<StockLineRowFragment>({
    type: 'Stock',
  });
  const packSizeAndUnitColumns: ColumnDescription<StockLineRowFragment>[] = [
    [
      'itemUnit',
      {
        accessor: ({ rowData }) => rowData.item.unitName,
        sortable: false,
        Cell: TooltipTextCell,
        width: 75,
      },
    ],
    ['packSize', { Cell: TooltipTextCell, width: 125 }],
  ];

  const columnDefinitions: ColumnDescription<StockLineRowFragment>[] = [
    [
      'itemCode',
      {
        accessor: ({ rowData }) => rowData.item.code,
        Cell: TooltipTextCell,
        width: 100,
      },
    ],
    [
      'itemName',
      {
        accessor: ({ rowData }) => rowData.item.name,
        Cell: TooltipTextCell,
        width: 350,
      },
    ],
    // TODO:: Add a column for the master list name
    ['batch', { Cell: TooltipTextCell, width: 100 }],
    [
      'expiryDate',
      {
        accessor: ({ rowData }) => DateUtils.getNaiveDate(rowData.expiryDate),
        width: 110,
      },
    ],
    [
      'location',
      {
        Cell: TooltipTextCell,
        width: 100,
        accessor: ({ rowData }) => rowData.location?.code,
      },
    ],
    ...packSizeAndUnitColumns,
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
        rowData.supplierName ? rowData.supplierName : t('message.no-supplier'),
      Cell: TooltipTextCell,
      width: 190,
    },
    ...pluginColumns,
  ];

  const columns = useColumns<StockLineRowFragment>(
    columnDefinitions,
    {
      sortBy,
      onChangeSortBy: updateSortQuery,
    },
    [sortBy, pluginColumns]
  );

  return (
    <>
      <Toolbar filter={filter} />
      <AppBarButtons />
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
        onRowClick={stockline => {
          navigate(
            RouteBuilder.create(AppRoute.Inventory)
              .addPart(AppRoute.Stock)
              .addPart(stockline.id)
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
