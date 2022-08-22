import React, { FC } from 'react';
import {
  TableProvider,
  DataTable,
  useColumns,
  createTableStore,
  NothingHere,
  createQueryParamsStore,
  useFormatDateTime,
  useUrlQueryParams,
  ColumnAlign,
  useNavigate,
  RouteBuilder,
} from '@openmsupply-client/common';
import { usePatient } from '../api';
import { EncounterFragmentWithId, EncounterRowFragment } from '../../Encounter';
import { AppRoute } from 'packages/config/src';

const EncounterListComponent: FC = () => {
  const {
    updateSortQuery,
    updatePaginationQuery,
    queryParams: { sortBy, page, first, offset },
  } = useUrlQueryParams();
  const { data, isError, isLoading } = usePatient.document.encounters();
  const pagination = { page, first, offset };
  const { localisedDateTime } = useFormatDateTime();
  const navigate = useNavigate();

  const columns = useColumns<EncounterRowFragment>(
    [
      {
        key: 'type',
        label: 'label.encounter-type',
      },
      {
        key: 'program',
        label: 'label.program',
      },
      {
        key: 'startDatetime',
        label: 'label.encounter-start',
        formatter: dateString =>
          dateString ? localisedDateTime((dateString as string) || '') : '',
      },
      {
        key: 'endDatetime',
        label: 'label.encounter-end',
        formatter: dateString =>
          dateString ? localisedDateTime((dateString as string) || '') : '',
      },
      {
        key: 'status',
        label: 'label.status',
        align: ColumnAlign.Right,
        width: 175,
      },
    ],
    { onChangeSortBy: updateSortQuery, sortBy },
    [sortBy]
  );

  return (
    <DataTable
      id="encounter-list"
      pagination={{ ...pagination, total: data?.totalCount }}
      onChangePage={updatePaginationQuery}
      columns={columns}
      data={data?.nodes}
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
    queryParamsStore={createQueryParamsStore<EncounterFragmentWithId>({
      initialSortBy: { key: 'startDatetime' },
    })}
  >
    <EncounterListComponent />
  </TableProvider>
);
