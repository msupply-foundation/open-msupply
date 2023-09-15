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

const EncounterListComponent: FC = () => {
  const {
    updateSortQuery,
    updatePaginationQuery,
    queryParams: { sortBy, page, first, offset },
  } = useUrlQueryParams({
    initialSort: {
      key: EncounterSortFieldInput.StartDatetime,
      dir: 'desc',
    },
  });
  const { data, isError, isLoading } = useEncounter.document.list({
    pagination: { first, offset },
    sortBy,
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
  );
};

export const EncounterListView: FC = () => (
  <TableProvider createStore={createTableStore}>
    <EncounterListComponent />
  </TableProvider>
);
