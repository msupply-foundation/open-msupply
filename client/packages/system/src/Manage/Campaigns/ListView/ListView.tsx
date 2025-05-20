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
} from '@openmsupply-client/common';
// import { useName } from '../../api';
import { Toolbar } from './Toolbar';
import { CampaignEditModal } from './CampaignEditModal';
import { AppBarButtons } from './AppBarButtons';
import { PropertiesImportModal } from './ImportProperties/PropertiesImportModal';
import { useCampaigns } from '../api';
// import { FacilityNameRowFragment } from '../../api/operations.generated';

const CampaignsComponent = () => {
  const t = useTranslation();
  const [selectedId, setSelectedId] = useState('');
  const {
    filter,
    updateSortQuery,
    updatePaginationQuery,
    queryParams: { sortBy, page, first, offset, filterBy },
  } = useUrlQueryParams({ initialSort: { key: 'name', dir: 'asc' } });

  const queryParams = { sortBy, first, offset, filterBy };
  const {
    query: { data, isError, isLoading },
    upsert: { upsert, upsertError, isUpserting },
    delete: { deleteCampaign, isDeleting, deleteError },
  } = useCampaigns(queryParams);

  const pagination = { page, first, offset };

  const { isOpen, onClose, onOpen } = useEditModal<any>();

  const onRowClick = (row: any) => {
    console.log('Saving a campaign)');
    // setSelectedId(row.id);
    // onOpen();
    deleteCampaign('random');
  };

  console.log('data', data);

  const columns = useColumns<any>(
    [
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
      {/* <Toolbar filter={filter} /> */}
      {/* {isOpen && (
        <FacilityEditModal
          isOpen={isOpen}
          nameId={selectedId}
          onClose={onClose}
          setNextFacility={setSelectedId}
        />
      )} */}
      <DataTable
        id="campaign-list"
        pagination={{ ...pagination, total: data?.totalCount ?? 0 }}
        onChangePage={updatePaginationQuery}
        columns={columns}
        data={data?.nodes}
        isLoading={isLoading}
        isError={isError}
        noDataElement={<NothingHere body={t('error.no-facilities')} />}
        onRowClick={onRowClick}
      />
    </>
  );
};

export const CampaignsList = () => (
  <TableProvider createStore={createTableStore}>
    <CampaignsComponent />
  </TableProvider>
);
