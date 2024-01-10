import React, { FC } from 'react';
import {
  TableProvider,
  DataTable,
  createTableStore,
  NothingHere,
  useUrlQueryParams,
  useNavigate,
  EncounterSortFieldInput,
} from '@openmsupply-client/common';
import { useEncounterListColumns } from './columns';
import {
  EncounterFragmentWithStatus,
  useEncounterFragmentWithStatus,
} from '../utils';
import { useEncounter } from '@openmsupply-client/programs';
import { Toolbar } from './Toolbar';

const EncounterListComponent: FC = () => {
  const {
    updateSortQuery,
    updatePaginationQuery,
    filter,
    queryParams: { sortBy, page, first, offset, filterBy },
  } = useUrlQueryParams({
    initialSort: {
      key: EncounterSortFieldInput.StartDatetime,
      dir: 'desc',
    },
    filters: [
      {
        key: 'patient.lastName',
      },
      {
        key: 'programEnrolment.programName',
      },
      {
        key: 'startDatetime',
        condition: 'between',
      },
      {
        key: 'status',
        condition: 'equalTo',
      },
    ],
  });
  const { data, isError, isLoading } = useEncounter.document.list({
    pagination: { first, offset },
    sortBy,
    filterBy: filterBy ?? undefined,
  });
  const navigate = useNavigate();
  const columns = useEncounterListColumns({
    onChangeSortBy: updateSortQuery,
    sortBy,
    includePatient: true,
  });
  const dataWithStatus: EncounterFragmentWithStatus[] | undefined =
    useEncounterFragmentWithStatus(data?.nodes);

  return (
    <>
      <Toolbar filter={filter} />
      <DataTable
        id="name-list"
        pagination={{ page, first, offset, total: data?.totalCount }}
        onChangePage={updatePaginationQuery}
        columns={columns}
        data={dataWithStatus}
        isLoading={isLoading}
        isError={isError}
        onRowClick={row => {
          navigate(String(row.id));
        }}
        noDataElement={<NothingHere />}
      />
    </>
  );
};

export const EncounterListView: FC = () => (
  <TableProvider createStore={createTableStore}>
    <EncounterListComponent />
  </TableProvider>
);
