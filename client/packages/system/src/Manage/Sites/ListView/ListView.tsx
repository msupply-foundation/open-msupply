import React, { useMemo } from 'react';
import {
  NothingHere,
  useUrlQueryParams,
  useEditModal,
  useTranslation,
  useNotification,
  usePaginatedMaterialTable,
  MaterialTable,
  ColumnDef,
} from '@openmsupply-client/common';
import { AppBarButtons } from './AppBarButtons';
import { Footer } from './Footer';
import { Toolbar } from './Toolbar';
import { SiteEditModal } from './SiteEditModal';
import {
  SiteRowFragment,
  defaultDraftSite,
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
    upsert: { upsert },
    deleteSite: { deleteSite },
    draft,
    updateDraft,
  } = useSites(queryParams);

  const { isOpen, onClose, onOpen } = useEditModal();
  const { error, success } = useNotification();

  const handleClose = () => {
    onClose();
    updateDraft(defaultDraftSite);
  };

  const handleCreate = () => {
    const nextId = Math.max(0, ...(data?.nodes?.map(s => s.id) ?? [])) + 1;
    updateDraft({ ...defaultDraftSite, id: nextId });
    onOpen();
  };

  const save = async () => {
    try {
      await upsert();
      success(t('messages.site-saved'))();
      handleClose();
    } catch (e) {
      error(String(e))();
    }
  };

  const columns = useMemo(
    (): ColumnDef<SiteRowFragment>[] => [
      {
        accessorKey: 'id',
        header: t('label.settings-site-id'),
        enableSorting: true,
      },
      {
        accessorKey: 'code',
        header: t('label.code'),
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
        code: selected.code ?? '',
        name: selected.name,
        password: '',
        clearHardwareId: false,
        hardwareId: selected.hardwareId,
        isNew: false,
      } as DraftSite);
      onOpen();
    }
  };

  const { table, selectedRows } = usePaginatedMaterialTable({
    tableId: 'site-list',
    columns,
    data: data?.nodes,
    totalCount: data?.totalCount ?? 0,
    isLoading: isFetching,
    isError,
    onRowClick,
    noDataElement: (
      <NothingHere body={t('error.no-sites')} onCreate={onOpen} />
    ),
  });

  return (
    <>
      <Toolbar filter={filter} />
      <AppBarButtons onOpen={handleCreate} />
      <MaterialTable table={table} />
      {isOpen && (
        <SiteEditModal
          isOpen={isOpen}
          site={draft}
          onClose={handleClose}
          upsert={save}
          updateDraft={updateDraft}
        />
      )}
      <Footer
        selectedRows={selectedRows}
        resetRowSelection={table.resetRowSelection}
        deleteSite={deleteSite}
      />
    </>
  );
};
