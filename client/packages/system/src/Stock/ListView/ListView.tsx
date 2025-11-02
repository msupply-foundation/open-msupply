import React, { FC, useMemo } from 'react';
import {
  TableProvider,
  createTableStore,
  useTranslation,
  NothingHere,
  useUrlQueryParams,
  TextWithTooltipCell,
  useNavigate,
  usePluginProvider,
  useEditModal,
  usePreferences,
  MaterialTable,
  usePaginatedMaterialTable,
  ColumnDef,
  ColumnType,
  UnitsAndDosesCell,
} from '@openmsupply-client/common';
import { StockLineRowFragment } from '../api';
import { AppBarButtons } from './AppBarButtons';
import { Toolbar } from './Toolbar';
import { useStockList } from '../api/hooks/useStockList';
import { NewStockLineModal } from '../Components/NewStockLineModal';

const StockListComponent: FC = () => {
  const {
    queryParams: { sortBy, first, offset, filterBy },
  } = useUrlQueryParams({
    initialSort: { key: 'expiryDate', dir: 'asc' },
    filters: [
      { key: 'vvmStatusId', condition: 'equalTo' },
      { key: 'search' },
      {
        key: 'location.code',
      },
      {
        key: 'expiryDate',
        condition: 'between',
      },
      {
        key: 'masterList.name',
      },
    ],
  });
  const navigate = useNavigate();
  const queryParams = {
    filterBy: { ...filterBy },
    offset,
    sortBy,
    first,
  };

  const t = useTranslation();
  const { data, isFetching, isError } = useStockList(queryParams);
  const { plugins } = usePluginProvider();
  const { manageVvmStatusForStock } = usePreferences();

  const { isOpen, onClose, onOpen } = useEditModal();

  const mrtColumns = useMemo(
    (): ColumnDef<StockLineRowFragment>[] => [
      {
        accessorKey: 'item.code',
        header: t('label.code'),
        Cell: TextWithTooltipCell,
        size: 100,
        enableSorting: true,
      },
      {
        id: 'name',
        accessorKey: 'item.name',
        header: t('label.name'),
        Cell: TextWithTooltipCell,
        size: 350,
        enableSorting: true,
      },
      // TODO: Add back when design has been decided
      // {
      //   accessorkey: 'masterList',
      //   header: t('label.master-list',
      //   Cell: ChipTableCell,
      //   width: 150,
      //   accessor: ({ rowData }) => rowData.item.masterLists.map(m => m.name),
      // },
      {
        accessorKey: 'batch',
        header: t('label.batch'),
        Cell: TextWithTooltipCell,
        size: 100,
        defaultHideOnMobile: true,
        enableSorting: true,
      },
      {
        id: 'expiryDate',
        header: t('label.expiry'),
        // expiryDate is a string - use accessorFn to convert to Date object for sort and filtering
        accessorFn: row => (row.expiryDate ? new Date(row.expiryDate) : null),
        columnType: ColumnType.Date,
        size: 120,
        defaultHideOnMobile: true,
        enableSorting: true,
      },

      {
        id: 'vvmStatus',
        header: t('label.vvm-status'),
        size: 150,
        accessorKey: 'vvmStatus?.description',
        defaultHideOnMobile: true,
        includeColumn: manageVvmStatusForStock,
        enableSorting: true,
      },

      {
        id: 'location',
        header: t('label.location'),
        Cell: TextWithTooltipCell,
        size: 100,
        defaultHideOnMobile: true,
        accessorKey: 'location?.code',
        enableSorting: true,
      },
      {
        id: 'itemUnit',
        header: t('label.unit'),
        accessorKey: 'item.unitName',
        enableSorting: false,
        Cell: TextWithTooltipCell,
        size: 75,
        defaultHideOnMobile: true,
      },
      {
        accessorKey: 'packSize',
        header: t('label.pack-size'),
        Cell: TextWithTooltipCell,
        align: 'right',
        size: 125,
        defaultHideOnMobile: true,
        enableSorting: true,
      },
      {
        header: t('label.pack-quantity'),
        accessorKey: 'totalNumberOfPacks',
        columnType: ColumnType.Number,
        align: 'right',
        size: 125,
        enableSorting: true,
      },
      {
        header: t('label.soh'),
        description: t('description.soh'),
        accessorFn: row => row.totalNumberOfPacks * row.packSize,
        align: 'right',
        enableSorting: false,
        defaultHideOnMobile: true,
        Cell: UnitsAndDosesCell,
      },
      {
        id: 'availableStockOnHand',
        header: t('label.available-soh'),
        description: t('description.available-soh'),
        accessorFn: row => row.availableNumberOfPacks * row.packSize,
        align: 'right',
        enableSorting: false,
        defaultHideOnMobile: true,
        Cell: UnitsAndDosesCell,
      },
      {
        accessorKey: 'costPricePerPack',
        header: t('label.pack-cost-price'),
        description: t('description.pack-cost'),
        columnType: ColumnType.Currency,
        size: 125,
        defaultHideOnMobile: true,
        enableSorting: true,
      },
      {
        id: 'totalCost',
        header: t('label.total'),
        accessorFn: row => row.totalNumberOfPacks * row.costPricePerPack,
        columnType: ColumnType.Currency,
        description: t('description.total-cost'),
        enableSorting: false,
        size: 125,
        defaultHideOnMobile: true,
      },
      {
        id: 'supplierName',
        header: t('label.supplier'),
        accessorFn: row =>
          row.supplierName ? row.supplierName : t('message.no-supplier'),
        Cell: TextWithTooltipCell,
        size: 190,
        defaultHideOnMobile: true,
        enableSorting: true,
      },
      ...(plugins.stockLine?.tableColumn || []),
    ],
    [t, manageVvmStatusForStock, plugins.stockLine?.tableColumn]
  );

  const { table } = usePaginatedMaterialTable<StockLineRowFragment>({
    tableId: 'stock-list',
    isLoading: isFetching,
    isError,
    onRowClick: row => navigate(row.id),
    columns: mrtColumns,
    data: data?.nodes,
    totalCount: data?.totalCount ?? 0,
    initialSort: { key: 'name', dir: 'desc' },
    enableRowSelection: false,
    noDataElement: (
      <NothingHere
        body={t('error.no-stock')}
        onCreate={onOpen}
        buttonText={t('button.add-new-stock')}
      />
    ),
  });

  return (
    <>
      <Toolbar />
      <AppBarButtons exportFilter={filterBy} />
      {plugins.stockLine?.tableStateLoader?.map((StateLoader, index) => (
        <StateLoader key={index} stockLines={data?.nodes ?? []} />
      ))}
      {isOpen && <NewStockLineModal isOpen={isOpen} onClose={onClose} />}
      <MaterialTable table={table} />
    </>
  );
};

export const StockListView: FC = () => (
  <TableProvider createStore={createTableStore}>
    <StockListComponent />
  </TableProvider>
);
