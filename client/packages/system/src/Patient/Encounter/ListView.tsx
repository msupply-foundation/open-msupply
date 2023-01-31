import React, { FC } from 'react';
import {
  TableProvider,
  DataTable,
  createTableStore,
  NothingHere,
  createQueryParamsStore,
  useNavigate,
  RouteBuilder,
  useQueryParamsStore,
  EncounterSortFieldInput,
  useUrlQueryParams,
} from '@openmsupply-client/common';
import { AppRoute } from 'packages/config/src';
import {
  EncounterFragmentWithStatus,
  useEncounterFragmentWithStatus,
} from '../../Encounter';
import { useEncounterListColumns } from '../../Encounter/ListView/columns';
import { useEncounter } from '@openmsupply-client/programs';
import { usePatient } from '../api';

const EncounterListComponent: FC = () => {
  const {
    sort: { sortBy, onChangeSortBy },
    pagination: { page, first, offset, onChangePage },
  } = useQueryParamsStore();

  const { queryParams } = useUrlQueryParams({
    initialSort: { key: 'startDatetime', dir: 'desc' },
  });

  const patientId = usePatient.utils.id();
  const { data, isError, isLoading } = useEncounter.document.list({
    ...queryParams,
    // enforce filtering by patient id
    filterBy: { ...queryParams.filterBy, patientId: { equalTo: patientId } },
    sortBy: {
      key: sortBy.key as EncounterSortFieldInput,
      isDesc: sortBy.isDesc,
      direction: sortBy.isDesc ? 'desc' : 'asc',
    },
  });
  const dataWithStatus: EncounterFragmentWithStatus[] | undefined =
    useEncounterFragmentWithStatus(data?.nodes);
  const pagination = { page, first, offset };
  const navigate = useNavigate();

  const columns = useEncounterListColumns({ onChangeSortBy, sortBy });

  return (
    <DataTable
      id="encounter-list"
      pagination={{ ...pagination, total: data?.totalCount }}
      onChangePage={onChangePage}
      columns={columns}
      data={dataWithStatus}
      isLoading={isLoading}
      isError={isError}
      onRowClick={row => {
        navigate(
          RouteBuilder.create(AppRoute.Dispensary)
            .addPart(AppRoute.Encounter)
            .addPart(row.id)
            .build()
        );
      }}
      noDataElement={<NothingHere />}
    />
  );
};

export const EncounterListView: FC = () => (
  <TableProvider
    createStore={createTableStore}
    queryParamsStore={createQueryParamsStore<EncounterFragmentWithStatus>({
      initialSortBy: { key: 'startDatetime' },
    })}
  >
    <EncounterListComponent />
  </TableProvider>
);
