import React, { useMemo } from 'react';
import {
  useTranslation,
  NothingHere,
  useUrlQueryParams,
  usePaginatedMaterialTable,
  ColumnDef,
  ColumnType,
  MaterialTable,
  useNavigate,
  RouteBuilder,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { getStatusTranslation } from '../utils';
import { StockMovementRowFragment } from '../api/operations.generated';
import { useStockMovementList } from '../api';
import { Toolbar } from './Toolbar';
import { AppBarButtons } from './AppBarButtons';
import { Footer } from './Footer';

export const ListView = () => {
  const t = useTranslation();
  const navigate = useNavigate();
  const {
    queryParams: { sortBy, first, offset, filterBy },
  } = useUrlQueryParams({
    initialSort: { key: 'createdDatetime', dir: 'desc' },
    filters: [
      { key: 'stockMovementNumber', condition: 'equalTo', isNumber: true },
      { key: 'status', condition: 'equalTo' },
      { key: 'username' },
      { key: 'createdDatetime', condition: 'between' },
    ],
  });

  const { data, isError, isFetching } = useStockMovementList({
    sortBy,
    first,
    offset,
    filterBy,
  });

  const columns = useMemo(
    (): ColumnDef<StockMovementRowFragment>[] => [
      {
        accessorKey: 'stockMovementNumber',
        header: t('label.number'),
        enableSorting: true,
      },
      {
        id: 'status',
        accessorFn: row => getStatusTranslation(row.status, t),
        header: t('label.status'),
        enableSorting: true,
      },
      {
        accessorKey: 'lineCount',
        header: t('label.lines'),
        columnType: ColumnType.Number,
      },
      {
        accessorKey: 'comment',
        header: t('label.comment'),
        columnType: ColumnType.Comment,
      },
      {
        id: 'createdDatetime',
        accessorFn: row => new Date(row.createdDatetime),
        header: t('label.created'),
        columnType: ColumnType.Date,
        enableSorting: true,
      },
      {
        id: 'createdBy',
        accessorFn: row => row.user?.username ?? '',
        header: t('label.created-by'),
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
    [t]
  );

  const { table, selectedRows } =
    usePaginatedMaterialTable<StockMovementRowFragment>({
      tableId: 'stock-movement-list',
      isLoading: isFetching,
      isError,
      columns,
      data: data?.nodes,
      totalCount: data?.totalCount ?? 0,
      onRowClick: row =>
        navigate(
          RouteBuilder.create(AppRoute.Inventory)
            .addPart(AppRoute.StockMovement)
            .addPart(row.id)
            .build()
        ),
      noDataElement: <NothingHere body={t('messages.no-stock-movements')} />,
    });

  return (
    <>
      <Toolbar />
      <AppBarButtons />
      <MaterialTable table={table} />
      <Footer
        selectedRows={selectedRows}
        resetRowSelection={table.resetRowSelection}
      />
    </>
  );
};
