import React, { useMemo } from 'react';
import {
  NothingHere,
  useUrlQueryParams,
  useTranslation,
  usePaginatedMaterialTable,
  MaterialTable,
  ColumnDef,
} from '@openmsupply-client/common';
import {
  SiteRowFragment,
  DraftSite,
  useSites,
} from '../api';

export const SitesList = () => {
  const t = useTranslation();
  const {
    filter,
    queryParams: { sortBy, first, offset },
  } = useUrlQueryParams({
    initialSort: { key: 'name', dir: 'asc' },
    filters: [{ key: 'name' }],
  });

  const queryParams = { ...filter, sortBy, first, offset };
  const {
    query: { data, isError, isFetching },
    updateDraft,
  } = useSites(queryParams);


  const columns = useMemo(
    (): ColumnDef<SiteRowFragment>[] => [
      {
        accessorKey: 'id',
        header: t('label.settings-site-id'),
        enableSorting: true,
      },
      {
        accessorKey: 'name',
        header: t('label.name'),
        enableSorting: true,
      },
      {
        accessorKey: 'hardwareId',
        header: t('label.hardware-id'),
      },
    ],
    []
  );

  const onRowClick = (row: SiteRowFragment) => {
    const selected = data?.nodes.find(site => site.id === row.id);
    if (selected) {
      updateDraft({
        id: selected.id,
        name: selected.name,
        password: '',
        clearHardwareId: false,
        hardwareId: selected.hardwareId,
        isNew: false,
      } as DraftSite);
    }
  };

  const { table } = usePaginatedMaterialTable({
    tableId: 'site-list',
    columns,
    data: data?.nodes,
    totalCount: data?.totalCount ?? 0,
    isLoading: isFetching,
    isError,
    onRowClick,
    noDataElement: (
      <NothingHere body={t('error.no-sites')} />
    ),
  });

  return (
    <>
      <MaterialTable table={table} />
    </>
  );
};
