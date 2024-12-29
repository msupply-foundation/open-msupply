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
  CurrencyCell,
  ExpiryDateCell,
  NumberCell,
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

  const columnDefinitions: ColumnDescription<StockLineRowFragment>[] = [
    {
      key: 'itemCode',
      accessor: ({ rowData }) => rowData.item.code,
      label: 'label.code',
      Cell: TooltipTextCell,
      width: 100,
    },
    {
      key: 'itemName',
      accessor: ({ rowData }) => rowData.item.name,
      label: 'label.name',
      Cell: TooltipTextCell,
      width: 350,
    },
    // TODO:: Add a column for the master list name
    { key: 'batch', label: 'label.batch', Cell: TooltipTextCell, width: 100 },
    {
      key: 'expiryDate',
      label: 'label.expiry',
      accessor: ({ rowData }) => DateUtils.getNaiveDate(rowData.expiryDate),
      Cell: ExpiryDateCell,
      width: 110,
    },
    {
      key: 'location',
      label: 'label.location',
      Cell: TooltipTextCell,
      width: 100,
      accessor: ({ rowData }) => rowData.location?.code,
    },
    {
      key: 'itemUnit',
      label: 'label.unit',
      accessor: ({ rowData }) => rowData.item.unitName,
      sortable: false,
      Cell: TooltipTextCell,
      width: 75,
    },
    {
      key: 'packSize',
      label: 'label.pack-size',
      Cell: TooltipTextCell,
      width: 125,
    },
    {
      key: 'numberOfPacks',
      Cell: NumberCell,
      accessor: ({ rowData }) => rowData.totalNumberOfPacks,
      width: 125,
    },
    [
      'stockOnHand',
      {
        accessor: ({ rowData }) =>
          rowData.totalNumberOfPacks * rowData.packSize,
        sortable: false,
        width: 125,
      },
    ],
    {
      key: 'costPricePerPack',
      label: 'label.pack-cost-price',
      description: 'description.pack-cost',
      Cell: CurrencyCell,
      width: 125,
    },
    {
      key: 'totalValue',
      label: 'label.total',
      accessor: ({ rowData }) =>
        rowData.totalNumberOfPacks * rowData.costPricePerPack,
      Cell: CurrencyCell,
      description: 'description.total-cost',
      width: 125,
    },
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
