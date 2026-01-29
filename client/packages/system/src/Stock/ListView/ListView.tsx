import React, { useMemo } from 'react';
import {
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
  ChipTableCell,
} from '@openmsupply-client/common';
import { StockLineRowFragment } from '../api';
import { AppBarButtons } from './AppBarButtons';
import { useStockList } from '../api/hooks/useStockList';
import { NewStockLineModal } from '../Components/NewStockLineModal';
import { ExpiryDateCell } from '@openmsupply-client/common/src/ui/layout/tables/material-react-table/components/ExpiryDateCell';

export const StockListView = () => {
  const {
    queryParams: { sortBy, first, offset, filterBy },
  } = useUrlQueryParams({
    initialSort: { key: 'itemName', dir: 'asc' },
    filters: [
      { key: 'vvmStatusId', condition: 'equalTo' },
      { key: 'search' },
      {
        key: 'location.code',
      },
      {
        key: 'name',
      },
      {
        key: 'code',
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
        id: 'code',
        accessorKey: 'item.code',
        header: t('label.code'),
        Cell: TextWithTooltipCell,
        size: 100,
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        id: 'name',
        accessorKey: 'item.name',
        header: t('label.name'),
        Cell: TextWithTooltipCell,
        size: 350,
        enableSorting: true,
        enableColumnFilter: true,
      },
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
        accessorFn: row => (row.expiryDate ? new Date(row.expiryDate) : null),
        columnType: ColumnType.Date,
        Cell: ExpiryDateCell,
        size: 100,
        defaultHideOnMobile: true,
        enableColumnFilter: true,
        dateFilterFormat: 'date',
        enableSorting: true,
      },
      {
        id: 'location.code',
        accessorFn: row => row.location?.code || '',
        header: t('label.location'),
        Cell: TextWithTooltipCell,
        size: 100,
        defaultHideOnMobile: true,
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        id: 'itemUnit',
        accessorKey: 'item.unitName',
        header: t('label.unit'),
        enableSorting: false,
        Cell: TextWithTooltipCell,
        size: 75,
        defaultHideOnMobile: true,
      },
      {
        header: t('label.pack-size'),
        accessorKey: 'packSize',
        Cell: TextWithTooltipCell,
        align: 'right',
        size: 90,
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
        Cell: UnitsAndDosesCell,
        align: 'right',
        size: 125,
        enableSorting: false,
        defaultHideOnMobile: true,
      },
      {
        id: 'availableStockOnHand',
        header: t('label.available-soh'),
        description: t('description.available-soh'),
        accessorFn: row => row.availableNumberOfPacks * row.packSize,
        Cell: UnitsAndDosesCell,
        align: 'right',
        size: 125,
        enableSorting: false,
        defaultHideOnMobile: true,
      },
      {
        header: t('label.pack-cost-price'),
        accessorKey: 'costPricePerPack',
        description: t('description.pack-cost'),
        columnType: ColumnType.Currency,
        size: 125,
        defaultHideOnMobile: true,
        enableSorting: true,
      },
      {
        id: 'totalCost',
        header: t('label.total'),
        description: t('description.total-cost'),
        accessorFn: row => row.totalNumberOfPacks * row.costPricePerPack,
        columnType: ColumnType.Currency,
        enableSorting: false,
        size: 125,
        defaultHideOnMobile: true,
      },
      {
        id: 'masterList.name',
        header: t('label.master-lists'),
        accessorFn: row => row.item?.masterLists?.map(m => m.name) ?? [],
        Cell: ChipTableCell,
        size: 150,
        enableColumnFilter: true,
      },
      {
        id: 'vvmStatus',
        header: t('label.vvm-status'),
        accessorFn: row => row.vvmStatus?.description ?? '',
        Cell: TextWithTooltipCell,
        size: 150,
        defaultHideOnMobile: true,
        includeColumn: manageVvmStatusForStock,
        enableSorting: true,
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
    [manageVvmStatusForStock, plugins.stockLine?.tableColumn, t]
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
      <AppBarButtons exportFilter={filterBy} />
      {plugins.stockLine?.tableStateLoader?.map((StateLoader, index) => (
        <StateLoader key={index} stockLines={data?.nodes ?? []} />
      ))}
      {isOpen && <NewStockLineModal isOpen={isOpen} onClose={onClose} />}
      <MaterialTable table={table} />
    </>
  );
};
