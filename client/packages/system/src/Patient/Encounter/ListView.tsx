import React, { FC } from 'react';
import {
  TableProvider,
  DataTable,
  createTableStore,
  NothingHere,
  useNavigate,
  RouteBuilder,
  useUrlQueryParams,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import {
  EncounterFragmentWithStatus,
  useEncounterFragmentWithStatus,
} from '../../Encounter';
import { useEncounterListColumns } from '../../Encounter/ListView/columns';
import { useEncounter } from '@openmsupply-client/programs';
import { usePatient } from '../api';

const EncounterListComponent: FC = () => {
  const {
    queryParams: { sortBy, page, first, offset, filterBy },
    updatePaginationQuery,
    updateSortQuery,
  } = useUrlQueryParams({ initialSort: { key: 'startDatetime', dir: 'desc' } });

  const patientId = usePatient.utils.id();
  const { data, isError, isLoading } = useEncounter.document.list({
    pagination: { first, offset },
    // enforce filtering by patient id
    filterBy: { ...filterBy, patientId: { equalTo: patientId } },
    sortBy,
  });
  const dataWithStatus: EncounterFragmentWithStatus[] | undefined =
    useEncounterFragmentWithStatus(data?.nodes);
  const navigate = useNavigate();

  const columns = useEncounterListColumns({
    onChangeSortBy: updateSortQuery,
    sortBy,
  });

  return (
    <DataTable
      id="encounter-list"
      pagination={{ page, first, offset, total: data?.totalCount }}
      onChangePage={updatePaginationQuery}
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
  <TableProvider createStore={createTableStore}>
    <EncounterListComponent />
  </TableProvider>
);
