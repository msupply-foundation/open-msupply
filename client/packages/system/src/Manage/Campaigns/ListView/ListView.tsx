import React, { useMemo } from 'react';
import {
  NothingHere,
  useUrlQueryParams,
  useEditModal,
  useTranslation,
  CampaignNode,
  useDeleteConfirmation,
  useNotification,
  usePaginatedMaterialTable,
  MaterialTable,
  ColumnType,
  ColumnDef,
} from '@openmsupply-client/common';
import { Footer } from './Footer';
import { CampaignEditModal } from './CampaignEditModal';
import { AppBarButtons } from './AppBarButtons';
import {
  CampaignRowFragment,
  defaultDraftCampaign,
  DraftCampaign,
  useCampaigns,
} from '../api';

export const CampaignsList = () => {
  const t = useTranslation();
  const {
    queryParams: { sortBy, first, offset, filterBy },
  } = useUrlQueryParams({ initialSort: { key: 'name', dir: 'asc' } });

  const queryParams = { sortBy, first, offset, filterBy };
  const {
    query: { data, isError, isFetching },
    upsert: { upsert },
    delete: { deleteCampaign },
    draft,
    updateDraft,
  } = useCampaigns(queryParams);

  const { isOpen, onClose, onOpen } = useEditModal();

  const { error, success } = useNotification();

  const save = async () => {
    const result = await upsert();

    // Closes on success and resets the draft
    if (result?.__typename === 'CampaignNode') {
      success(t('messages.campaign-saved'))();
      onClose();
      updateDraft(defaultDraftCampaign);
      return;
    }

    if (result?.__typename === 'UpsertCampaignError') {
      const isUniqueValidation =
        '__typename' in result.error &&
        result.error.__typename === 'UniqueValueViolation';

      const errorMessage = isUniqueValidation
        ? t('messages.error-campaign-name-already-exists')
        : `${t('messages.error-saving-campaign')} — ${result.error.description ?? ''}`;
      error(errorMessage)();
    }
  };
  const columns = useMemo(
    (): ColumnDef<CampaignRowFragment>[] => [
      { accessorKey: 'name', header: t('label.name'), enableSorting: true },
      {
        accessorKey: 'startDate',
        header: t('label.start-date'),
        columnType: ColumnType.Date,
      },
      {
        accessorKey: 'endDate',
        header: t('label.end-date'),
        columnType: ColumnType.Date,
      },
    ],
    []
  );

  const onRowClick = (row: CampaignNode) => {
    const selected = data?.nodes.find(campaign => campaign.id === row.id);
    updateDraft(selected as DraftCampaign);
    onOpen();
  };

  const { table, selectedRows } = usePaginatedMaterialTable({
    tableId: 'campaign-list',
    columns,
    data: data?.nodes,
    totalCount: data?.totalCount ?? 0,
    isLoading: isFetching,
    isError,
    onRowClick,
    noDataElement: (
      <NothingHere body={t('error.no-campaigns')} onCreate={onOpen} />
    ),
  });

  const confirmAndDelete = useDeleteConfirmation({
    selectedRows,
    deleteAction: async () => {
      const result = await Promise.all(
        selectedRows.map(row => {
          if (row) {
            return deleteCampaign(row.id);
          }
        })
      );
      if (result.some(row => row?.__typename !== 'DeleteCampaignSuccess')) {
        // Will currently show the "Can't delete" toast if *any* of the rows
        // fail to delete
        throw new Error('Delete failed');
      }
      table.resetRowSelection();
    },
    messages: {
      confirmMessage: t('messages.confirm-delete-campaigns', {
        count: selectedRows.length,
      }),
      deleteSuccess: t('messages.deleted-campaigns', {
        count: selectedRows.length,
      }),
    },
  });

  return (
    <>
      <AppBarButtons onOpen={onOpen} />
      <MaterialTable table={table} />
      <Footer
        selectedRowCount={selectedRows.length}
        deleteRows={confirmAndDelete}
        resetRowSelection={table.resetRowSelection}
      />
      {isOpen && (
        <CampaignEditModal
          isOpen={isOpen}
          campaign={draft}
          onClose={onClose}
          upsert={save}
          updateDraft={updateDraft}
        />
      )}
    </>
  );
};
