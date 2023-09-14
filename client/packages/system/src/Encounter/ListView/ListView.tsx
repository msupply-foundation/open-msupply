import React, { FC } from 'react';
import {
  TableProvider,
  DataTable,
  createTableStore,
  NothingHere,
  useUrlQueryParams,
  useNavigate,
  createQueryParamsStore,
  EncounterSortFieldInput,
  useQueryParamsStore,
} from '@openmsupply-client/common';
import { useEncounterListColumns } from './columns';
import {
  EncounterFragmentWithStatus,
  useEncounterFragmentWithStatus,
} from '../utils';
import { EncounterFragment, useEncounter } from '@openmsupply-client/programs';

const EncounterListComponent: FC = () => {
  const {
    updatePaginationQuery,
    queryParams: { page, first, offset },
  } = useUrlQueryParams({
    initialSort: {
      key: EncounterSortFieldInput.StartDatetime,
      dir: 'desc',
    },
  });
  const {
    sort: { sortBy, onChangeSortBy },
  } = useQueryParamsStore();
  const { data, isError, isLoading } = useEncounter.document.list({
    pagination: { first, offset },
    sortBy,
  });
  const navigate = useNavigate();
  const columns = useEncounterListColumns({
    onChangeSortBy,
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
  <TableProvider
    createStore={createTableStore}
    queryParamsStore={createQueryParamsStore<EncounterFragment>({
      initialSortBy: {
        key: EncounterSortFieldInput.StartDatetime,
        isDesc: true,
      },
    })}
  >
    <EncounterListComponent />
  </TableProvider>
);
