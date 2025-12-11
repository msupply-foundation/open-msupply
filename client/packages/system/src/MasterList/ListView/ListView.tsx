import React, { useMemo } from 'react';
import {
  useNavigate,
  NothingHere,
  useTranslation,
  useUrlQueryParams,
  TextWithTooltipCell,
  useAuthContext,
  usePluginProvider,
  ColumnDef,
  usePaginatedMaterialTable,
  MaterialTable,
} from '@openmsupply-client/common';
import { AppBarButtons } from './AppBarButtons';
import { MasterListRowFragment, useMasterLists } from '../api';

const MasterListComponent = () => {
  const t = useTranslation();
  const navigate = useNavigate();
  const { store } = useAuthContext();
  const { plugins } = usePluginProvider();

  const {
    queryParams: { sortBy, first, offset, filterBy },
  } = useUrlQueryParams({
    filters: [{ key: 'name' }],
  });

  const { data, isError, isLoading } = useMasterLists({
    queryParams: {
      first,
      offset,
      sortBy,
      filterBy: {
        ...filterBy,
        existsForStoreId: { equalTo: store?.id },
      },
    },
  });

  const columns = useMemo(
    (): ColumnDef<MasterListRowFragment>[] => [
      {
        header: t('label.name'),
        accessorKey: 'name',
        Cell: TextWithTooltipCell,
        size: 300,
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        header: t('label.description'),
        accessorKey: 'description',
        Cell: TextWithTooltipCell,
        minSize: 100,
        size: 600,
      },
      ...(plugins.masterLists?.tableColumn || []),
    ],
    [plugins.masterLists?.tableColumn]
  );

  const { table } =
    usePaginatedMaterialTable<MasterListRowFragment>({
      tableId: 'master-list-view',
      isLoading,
      isError,
      columns,
      data: data?.nodes ?? [],
      enableRowSelection: false,
      onRowClick: row => navigate(row.id),
      totalCount: data?.totalCount ?? 0,
      noDataElement: (
        <NothingHere body={t('error.no-master-lists')}/>
      ),
    });

  return (
    <>
      <AppBarButtons data={data?.nodes ?? []} />
      {plugins.masterLists?.tableStateLoader?.map((StateLoader, index) => (
        <StateLoader key={index} masterLists={data?.nodes ?? []} />
      ))}

      <MaterialTable table={table} />
    </>
  );
};

export const MasterListListView = () => (
  <MasterListComponent />
);
