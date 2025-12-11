import React, { useMemo } from 'react';
import {
  MasterListRowFragment,
  useMasterLists,
} from '@openmsupply-client/system';
import { NothingHere } from '@common/components';
import {
  Box,
  useTranslation,
  useAuthContext,
  TextWithTooltipCell,
  ColumnDef,
  useNonPaginatedMaterialTable,
  MaterialTable,
} from '@openmsupply-client/common';

const MasterListsTable = ({ itemId }: { itemId?: string }) => {
  const t = useTranslation();
  const { store } = useAuthContext();

  const { data, isLoading } = useMasterLists({
    queryParams: {
      filterBy: {
        existsForStoreId: { equalTo: store?.id },
        itemId: { equalTo: itemId ?? '' },
      },
    },
  });

  const columns = useMemo(
    (): ColumnDef<MasterListRowFragment>[] => [
      {
        header: t('label.code'),
        accessorKey: 'code',
        Cell: TextWithTooltipCell,
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        header: t('label.name'),
        accessorKey: 'name',
        Cell: TextWithTooltipCell,
        size: 200,
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        header: t('label.description'),
        accessorKey: 'description',
        Cell: TextWithTooltipCell,
        minSize: 100,
        enableSorting: true,
        enableColumnFilter: true,
      }
    ],
    []
  );

  const { table } = useNonPaginatedMaterialTable<MasterListRowFragment>({
    tableId: 'item-detail-master-lists',
    columns,
    isLoading,
    data: data?.nodes,
    enableRowSelection: false,
    noDataElement: <NothingHere body={t('error.no-master-list')} />,
  });

  return <MaterialTable table={table} />;
};

export const MasterListsTab = ({ itemId }: { itemId?: string }) => (
  <Box justifyContent="center" display="flex" flex={1}>
    <Box flex={1} display="flex">
      <MasterListsTable itemId={itemId} />
    </Box>
  </Box>
);
