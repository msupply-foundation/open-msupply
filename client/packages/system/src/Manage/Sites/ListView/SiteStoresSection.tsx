import React, { useMemo, useState } from 'react';
import {
  Box,
  ColumnDef,
  DeleteIcon,
  IconButton,
  MaterialTable,
  Typography,
  useNonPaginatedMaterialTable,
  useTranslation,
} from '@openmsupply-client/common';
import { StoreRowFragment } from '../../../Store/api';
import { StoreSearchInput } from '../../../Store/components';
import { SiteStoreDraftRow } from '../api';

const UNASSIGNED_SITE_ID = 1;
interface SiteStoresSectionProps {
  siteId: number;
  stores: SiteStoreDraftRow[];
  isFetching: boolean;
  onAddStore: (store: SiteStoreDraftRow) => void;
  onRemoveStore: (storeId: string) => void;
}

export const SiteStoresSection = ({
  siteId,
  stores,
  isFetching,
  onAddStore,
  onRemoveStore,
}: SiteStoresSectionProps) => {
  const t = useTranslation();
  const [searchKey, setSearchKey] = useState(0);

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
      {
        id: 'remove',
        header: '',
        size: 48,
        enableColumnActions: false,
        enableResizing: false,
        Cell: ({ row }) => (
          <IconButton
            icon={<DeleteIcon fontSize="small" />}
            label={t('label.remove')}
            disabled={siteId === UNASSIGNED_SITE_ID}
            onClick={() => onRemoveStore(row.original.id)}
          />
        ),
      },
    ],
    [t, siteId, onRemoveStore]
  );

  const { table } = useNonPaginatedMaterialTable<SiteStoreDraftRow>({
    tableId: 'site-stores-table',
    columns,
    data: stores,
    isLoading: isFetching,
    enableRowSelection: false,
  });

  const handleSelect = (store: StoreRowFragment) => {
    onAddStore({
      id: store.id,
      code: store.code,
      storeName: store.storeName,
    });
    setSearchKey(k => k + 1);
  };

  return (
    <Box display="flex" flexDirection="column" gap={1}>
      <Typography variant="subtitle1" fontWeight="bold">
        {t('heading.stores')}
      </Typography>
      <StoreSearchInput
        key={searchKey}
        clearable
        fullWidth
        onChange={handleSelect}
        onInputChange={() => { }}
      />
      <MaterialTable table={table} />
    </Box>
  );
};
