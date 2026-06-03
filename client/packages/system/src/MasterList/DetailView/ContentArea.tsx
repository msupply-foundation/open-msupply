import React, { useMemo } from 'react';
import {
  useTranslation,
  useUrlQueryParams,
  NothingHere,
} from '@openmsupply-client/common';

import {
  usePaginatedMaterialTable,
  MaterialTable,
  ColumnDef,
  TextWithTooltipCell,
} from '@common/tables';
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
        accessorKey: 'item.code',
        header: t('label.code'),
        size: 100,
      },
      {
        accessorKey: 'item.name',
        header: t('label.name'),
        Cell: TextWithTooltipCell,
        size: 350,
        enableSorting: true,
      },
      {
        accessorKey: 'item.unitName',
        header: t('label.unit'),
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
