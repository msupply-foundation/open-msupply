import React, { useMemo } from 'react';
import {
  Box,
  ColumnDef,
  MaterialTable,
  Typography,
  useNonPaginatedMaterialTable,
  useTranslation,
} from '@openmsupply-client/common';
import { SiteStoreDraftRow } from '../api';

interface SiteStoresSectionProps {
  siteId: number;
  stores: SiteStoreDraftRow[];
  isFetching: boolean;
}

export const SiteStoresSection = ({
  siteId,
  stores,
  isFetching,
}: SiteStoresSectionProps) => {
  const t = useTranslation();

  const columns = useMemo(
    (): ColumnDef<SiteStoreDraftRow>[] => [
      {
        accessorKey: 'code',
        header: t('label.code'),
        size: 120,
      },
      {
        accessorKey: 'storeName',
        header: t('label.name'),
        size: 240,
      },
    ],
    [t, siteId]
  );

  const { table } = useNonPaginatedMaterialTable<SiteStoreDraftRow>({
    tableId: 'site-stores-table',
    columns,
    data: stores,
    isLoading: isFetching,
    enableRowSelection: false,
  });

  return (
    <Box display="flex" flexDirection="column" gap={1}>
      <Typography variant="subtitle1" fontWeight="bold">
        {t('heading.stores')}
      </Typography>
      <MaterialTable table={table} />
    </Box>
  );
};
