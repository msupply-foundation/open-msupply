import React, { useMemo } from 'react';
import {
  useNavigate,
  TableProvider,
  createTableStore,
  NothingHere,
  useTranslation,
  useUrlQueryParams,
  ColumnAlign,
  TextWithTooltipCell,
  ColumnType,
  ColumnDef,
  usePaginatedMaterialTable,
  MaterialTable,
} from '@openmsupply-client/common';
import { useVisibleOrOnHandItems, ItemsWithStatsFragment } from '../api';
import { Toolbar } from './Toolbar';

const ItemListComponent = () => {
  const t = useTranslation();
  const navigate = useNavigate();

  const {
    queryParams,
  } = useUrlQueryParams({
    filters: [
      { key: 'code' },
      { key: 'name' },
      { key: 'hasStockOnHand', condition: '=' },
      { key: 'minMonthsOfStock', condition: 'isNumber' },
      { key: 'maxMonthsOfStock', condition: 'isNumber' },
      { key: 'stockStatus' },
      { key: 'productsAtRiskOfBeingOutOfStock', condition: '=' },
    ],
  });
  const { data, isError, isLoading } = useVisibleOrOnHandItems(queryParams);

  const columns = useMemo(
    (): ColumnDef<ItemsWithStatsFragment>[] => [
      {
        header: t('label.code'),
        accessorKey: 'code',
        size: 75,
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        header: t('label.name'),
        accessorKey: 'name',
        Cell: TextWithTooltipCell,
        size: 350,
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        header: t('label.unit'),
        accessorFn: row => row.unitName,
        align: ColumnAlign.Right,
        size: 130,
      },
      {
        header: t('label.stock-on-hand'),
        description: t('description.stock-on-hand'),
        id: 'stockOnHand',
        accessorFn: row => row.stats.stockOnHand,
        // TODO: make custom cell work with MRT
        // Cell: UnitsAndMaybeDosesCell,
        columnType: ColumnType.Number,
        size: 180,
      },
      {
        header: t('label.amc'),
        description: t('description.average-monthly-consumption'),
        accessorFn: row => row.stats.averageMonthlyConsumption,
        // Cell: UnitsAndMaybeDosesCell,
        columnType: ColumnType.Number,
        size: 180,
      },
      {
        header: t('label.months-of-stock'),
        description: t('description.months-of-stock'),
        accessorFn: row => row.stats.monthsOfStockOnHand ?? 0,
        columnType: ColumnType.Number,
        size: 120,
        // TODO: Mix-max filter on months of stock
        // enableColumnFilter: true,
        // filterVariant: 'range',
      }
    ],
    []
  );

  const { table } =
    usePaginatedMaterialTable<ItemsWithStatsFragment>({
      tableId: 'item-list-view',
      isLoading,
      isError,
      columns,
      data: data?.nodes ?? [],
      enableRowSelection: false,
      onRowClick: row => navigate(row.id),
      totalCount: data?.totalCount ?? 0,
      noDataElement: (
        <NothingHere body={t('error.no-items-to-display')} />
      ),
    });

  return (
    <>
      <Toolbar />

      <MaterialTable table={table} />
    </>
  );
};

export const ItemListView = () => (
  <TableProvider createStore={createTableStore}>
    <ItemListComponent />
  </TableProvider>
);

// const UnitsAndMaybeDosesCell = ({}) => {
//   const { rowData, column } = props;
//   const units = Number(column.accessor({ rowData })) ?? 0;
//   const { isVaccine, doses } = rowData;

//   return (
//     <UnitsAndMaybeDoses
//       numberCellProps={props}
//       units={units}
//       isVaccine={isVaccine}
//       dosesPerUnit={doses}
//     />
//   );
// };
