import React, { useState } from 'react';
import {
  TableProvider,
  DataTable,
  useColumns,
  createTableStore,
  NothingHere,
  useUrlQueryParams,
  DotCell,
  ColumnAlign,
  useEditModal,
  useToggle,
  TooltipTextCell,
  useTranslation,
  ColumnFormat,
  CampaignNode,
  GenericColumnKey,
  useTableStore,
  useDeleteConfirmation,
} from '@openmsupply-client/common';
// import { useName } from '../../api';
import { Toolbar } from './Toolbar';
import { Footer } from './Footer';
import { CampaignEditModal } from './CampaignEditModal';
import { AppBarButtons } from './AppBarButtons';
import { CampaignRowFragment, DraftCampaign, useCampaigns } from '../api';

const CampaignsComponent = () => {
  const t = useTranslation();
  // const [selectedCampaign, setSelectedCampaign] = useState<
  //   CampaignNode | undefined
  // >();
  const {
    filter,
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

  const { isOpen, onClose, onOpen } = useEditModal<any>();

  const { selectedRows } = useTableStore(state => ({
    selectedRows: Object.keys(state.rowState)
      .filter(id => state.rowState[id]?.isSelected)
      .map(selectedId => data?.nodes?.find(({ id }) => selectedId === id))
      .filter(Boolean),
  }));

  const confirmAndDelete = useDeleteConfirmation({
    selectedRows,
    deleteAction: async () =>
      selectedRows.forEach(row => {
        if (row) {
          deleteCampaign(row.id);
        }
      }),
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
    // setSelectedCampaign(selected);
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
      },
      {
        key: 'endDate',
        label: 'label.end-date',
        width: 150,
        format: ColumnFormat.Date,
        sortable: false,
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
      {isOpen && (
        <CampaignEditModal
          isOpen={isOpen}
          campaign={draft}
          onClose={onClose}
          upsert={upsert}
          updateDraft={updateDraft}
        />
      )}
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
    </>
  );
};

export const CampaignsList = () => (
  <TableProvider createStore={createTableStore}>
    <CampaignsComponent />
  </TableProvider>
);
