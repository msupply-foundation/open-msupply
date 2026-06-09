import React, { useMemo } from 'react';
import {
  useTranslation,
  NothingHere,
  useUrlQueryParams,
  usePaginatedMaterialTable,
  useEditModal,
  ColumnDef,
  ColumnType,
  MaterialTable,
} from '@openmsupply-client/common';
import { getStatusTranslation } from '../utils';
import { StockMovementRowFragment } from '../api/operations.generated';
import { useStockMovementList } from '../api';
import { Toolbar } from './Toolbar';
import { AppBarButtons } from './AppBarButtons';
import { StockMovementModal } from './StockMovementModal';

export const ListView = () => {
  const t = useTranslation();
  const {
    queryParams: { sortBy, first, offset, filterBy },
  } = useUrlQueryParams({
    filters: [
      { key: 'status', condition: 'equalTo' },
      { key: 'itemCodeOrName' },
      { key: 'fromLocationCode' },
      { key: 'toLocationCode' },
    ],
  });

  const { data, isError, isFetching } = useStockMovementList({
    sortBy,
    first,
    offset,
    filterBy,
  });

  const { isOpen, entity, mode, onOpen, onClose } =
    useEditModal<StockMovementRowFragment>();

  const columns = useMemo(
    (): ColumnDef<StockMovementRowFragment>[] => [
      {
        accessorKey: 'itemCode',
        header: t('label.code'),
        enableSorting: true,
      },
      {
        accessorKey: 'itemName',
        header: t('label.name'),
        enableSorting: true,
      },
      {
        accessorKey: 'batch',
        header: t('label.batch'),
        enableSorting: true,
      },
      {
        id: 'expiryDate',
        accessorFn: row => (row.expiryDate ? new Date(row.expiryDate) : null),
        header: t('label.expiry'),
        columnType: ColumnType.Date,
        enableSorting: true,
      },
      {
        accessorKey: 'numberOfPacks',
        header: t('label.num-packs'),
        columnType: ColumnType.Number,
        enableSorting: true,
      },
      {
        id: 'fromLocation',
        accessorFn: row => row.fromLocation?.code ?? '',
        header: t('label.from-location'),
        enableSorting: true,
      },
      {
        id: 'toLocation',
        accessorFn: row => row.toLocation?.code ?? '',
        header: t('label.to-location'),
        enableSorting: true,
      },
      {
        id: 'status',
        accessorFn: row => getStatusTranslation(row.status, t),
        header: t('label.status'),
        enableSorting: true,
      },
      {
        id: 'createdDatetime',
        accessorFn: row => new Date(row.createdDatetime),
        header: t('label.created'),
        columnType: ColumnType.Date,
        enableSorting: true,
      },
      {
        id: 'finalisedDatetime',
        accessorFn: row =>
          row.finalisedDatetime ? new Date(row.finalisedDatetime) : null,
        header: t('label.finalised'),
        columnType: ColumnType.Date,
        enableSorting: true,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const { table } = usePaginatedMaterialTable<StockMovementRowFragment>({
    tableId: 'stock-movement-list',
    isLoading: isFetching,
    isError,
    columns,
    data: data?.nodes,
    totalCount: data?.totalCount ?? 0,
    enableRowSelection: false,
    onRowClick: row => onOpen(row),
    noDataElement: <NothingHere body={t('messages.no-stock-movements')} />,
  });

  return (
    <>
      <Toolbar />
      <AppBarButtons />
      <MaterialTable table={table} />
      {isOpen && entity && (
        <StockMovementModal
          open={isOpen}
          mode={mode}
          movement={entity}
          onClose={onClose}
        />
      )}
    </>
  );
};
