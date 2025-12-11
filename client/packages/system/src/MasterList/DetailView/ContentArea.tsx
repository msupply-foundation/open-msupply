import React, { useMemo } from 'react';
import {
  useTranslation,
  useUrlQueryParams,
  usePaginatedMaterialTable,
  MaterialTable,
  ColumnDef,
  TextWithTooltipCell,
  NothingHere,
} from '@openmsupply-client/common';
import { MasterListLineFragment } from '../api/operations.generated';
import { useMasterListLines } from '../api/hooks/useMasterListLines';

export const ContentArea = () => {
  const t = useTranslation();

  const {
    queryParams,
  } = useUrlQueryParams({
    initialSort: { key: 'itemName', dir: 'asc' },
  });
  const { data, isError, isLoading } = useMasterListLines(queryParams);

  const columns = useMemo<ColumnDef<MasterListLineFragment>[]>(
    () => [
      {
        header: t('label.code'),
        id: 'itemCode',
        accessorFn: row => row.item.code,
        size: 100,
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        header: t('label.name'),
        id: 'itemName',
        accessorFn: row => row.item.name,
        Cell: TextWithTooltipCell,
        size: 350,
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        header: t('label.unit'),
        accessorFn: row => row.item.unitName,
        enableSorting: false,
      },
    ],
    []
  );

  const { table } = usePaginatedMaterialTable<MasterListLineFragment>({
    tableId: 'master-list-detail',
    isLoading,
    isError,
    columns,
    data: data?.nodes ?? [],
    totalCount: data?.totalCount ?? 0,
    enableRowSelection: false,
    initialSort: { key: 'itemName', dir: 'asc' },
    noDataElement: <NothingHere body={t('error.no-items')} />,
  });

  return <MaterialTable table={table} />;
};
