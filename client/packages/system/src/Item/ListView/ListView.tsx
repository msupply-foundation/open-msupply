import React, { useMemo } from 'react';
import {
  useNavigate,
  NothingHere,
  useTranslation,
  useUrlQueryParams,
  TextWithTooltipCell,
  ColumnType,
  ColumnDef,
  usePaginatedMaterialTable,
  MaterialTable,
  UnitsAndDosesCell,
  ChipTableCell,
} from '@openmsupply-client/common';
import { useVisibleOrOnHandItems, ItemsWithStatsFragment } from '../api';
import { Toolbar } from './Toolbar';

export const ItemListView = () => {
  const t = useTranslation();
  const navigate = useNavigate();

  const { queryParams } = useUrlQueryParams({
    initialSort: { key: 'name', dir: 'asc' },
    filters: [
      { key: 'codeOrName' },
      { key: 'hasStockOnHand', condition: '=' },
      { key: 'minMonthsOfStock', condition: 'isNumber' },
      { key: 'maxMonthsOfStock', condition: 'isNumber' },
      { key: 'stockStatus' },
      { key: 'productsAtRiskOfBeingOutOfStock', condition: '=' },
      { key: 'masterListId', condition: 'equalTo' },
    ],
  });
  const { data, isError, isLoading } = useVisibleOrOnHandItems(queryParams);

  // required to have correct type for UnitsAndDosesCell.
  // Memoised on the query result so we don't hand MaterialReactTable a brand
  // new `data` array on every unrelated re-render (which makes it recompute its
  // row models and rebuild rows).
  const rows = useMemo(
    () =>
      (data?.nodes ?? []).map(row => ({
        ...row,
        item: {
          doses: row.doses,
          isVaccine: row.isVaccine,
        },
      })),
    [data?.nodes]
  );

  const columns = useMemo(
    (): ColumnDef<
      ItemsWithStatsFragment & { item: { doses: number; isVaccine: boolean } }
    >[] => [
      {
        accessorKey: 'code',
        header: t('label.code'),
        size: 100,
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        accessorKey: 'name',
        header: t('label.name'),
        Cell: TextWithTooltipCell,
        size: 350,
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        id: 'masterLists',
        header: t('label.master-lists'),
        accessorFn: row => row.masterLists?.map(m => m.name) ?? [],
        Cell: ChipTableCell,
        size: 200,
      },
      {
        id: 'unitName',
        header: t('label.unit'),
        accessorFn: row => row.unitName,
        size: 130,
      },
      {
        id: 'stockOnHand',
        accessorFn: row => row.stats.stockOnHand,
        header: t('label.stock-on-hand'),
        description: t('description.stock-on-hand'),
        Cell: UnitsAndDosesCell,
        columnType: ColumnType.Number,
        size: 180,
      },
      {
        accessorKey: 'stats.averageMonthlyConsumption',
        header: t('label.amc'),
        description: t('description.average-monthly-consumption'),
        Cell: UnitsAndDosesCell,
        columnType: ColumnType.Number,
        size: 180,
      },
      {
        accessorKey: 'stats.monthsOfStockOnHand',
        header: t('label.months-of-stock'),
        description: t('description.months-of-stock'),
        columnType: ColumnType.Number,
        size: 120,
      },
    ],
    []
  );

  const { table } = usePaginatedMaterialTable<
    ItemsWithStatsFragment & { item: { doses: number; isVaccine: boolean } }
  >({
    tableId: 'item-list-view',
    isLoading,
    isError,
    columns,
    data: rows,
    enableRowSelection: false,
    onRowClick: row => navigate(row.id),
    totalCount: data?.totalCount ?? 0,
    noDataElement: <NothingHere body={t('error.no-items-to-display')} />,
  });

  return (
    <>
      <Toolbar />
      <MaterialTable table={table} />
    </>
  );
};
