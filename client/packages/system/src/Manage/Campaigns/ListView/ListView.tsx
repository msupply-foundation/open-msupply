import React from 'react';
import {
  TableProvider,
  DataTable,
  useColumns,
  createTableStore,
  NothingHere,
  useUrlQueryParams,
  useEditModal,
  useTranslation,
  ColumnFormat,
  CampaignNode,
  GenericColumnKey,
  useTableStore,
  useDeleteConfirmation,
  useNotification,
  DateUtils,
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

const CampaignsComponent = () => {
  const t = useTranslation();
  const {
    updateSortQuery,
    updatePaginationQuery,
    queryParams: { sortBy, page, first, offset, filterBy },
  } = useUrlQueryParams({ initialSort: { key: 'name', dir: 'asc' } });

  const queryParams = { sortBy, first, offset, filterBy };
  const {
    query: { data, isError, isLoading },
    upsert: { upsert },
    delete: { deleteCampaign },
    draft,
    updateDraft,
  } = useCampaigns(queryParams);

  const pagination = { page, first, offset };

  const { isOpen, onClose, onOpen } = useEditModal();

  const { error, success } = useNotification();

  const { selectedRows } = useTableStore(state => ({
    selectedRows: Object.keys(state.rowState)
      .filter(id => state.rowState[id]?.isSelected)
      .map(selectedId => data?.nodes?.find(({ id }) => selectedId === id))
      .filter(Boolean),
  }));

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

  const onRowClick = (row: CampaignNode) => {
    const selected = data?.nodes.find(campaign => campaign.id === row.id);
    updateDraft(selected as DraftCampaign);
    onOpen();
  };

  const columns = useColumns<CampaignRowFragment>(
    [
      GenericColumnKey.Selection,
      'name',
      {
        key: 'startDate',
        label: 'label.start-date',
        width: 150,
        format: ColumnFormat.Date,
        sortable: false,
        accessor: ({ rowData }) => DateUtils.getNaiveDate(rowData.startDate),
      },
      {
        key: 'endDate',
        label: 'label.end-date',
        width: 150,
        format: ColumnFormat.Date,
        sortable: false,
        accessor: ({ rowData }) => DateUtils.getNaiveDate(rowData.endDate),
      },
    ],
    {
      sortBy,
      onChangeSortBy: updateSortQuery,
    },
    [sortBy]
  );

  return (
    <>
      <AppBarButtons onOpen={onOpen} />
      <DataTable
        id="campaign-list"
        pagination={{ ...pagination, total: data?.totalCount ?? 0 }}
        onChangePage={updatePaginationQuery}
        columns={columns}
        data={data?.nodes}
        isLoading={isLoading}
        isError={isError}
        noDataElement={<NothingHere body={t('error.no-campaigns')} />}
        onRowClick={onRowClick}
      />
      <Footer
        selectedRowCount={selectedRows.length}
        deleteRows={confirmAndDelete}
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

export const CampaignsList = () => (
  <TableProvider createStore={createTableStore}>
    <CampaignsComponent />
  </TableProvider>
);
