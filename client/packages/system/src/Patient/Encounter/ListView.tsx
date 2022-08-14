import React, { FC, useMemo } from 'react';
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
} from '@openmsupply-client/common';
import { EncounterFragment, useEncounter } from './api';
import { usePatientModalStore } from '../hooks';
import { PatientModal } from '../DetailView';

type EncounterFragmentWithId = { id: string } & EncounterFragment;

const EncounterListComponent: FC = () => {
  const {
    updateSortQuery,
    updatePaginationQuery,
    queryParams: { sortBy, page, first, offset },
  } = useUrlQueryParams();
  const { data, isError, isLoading } = useEncounter.document.list();
  const dataWithId: EncounterFragmentWithId[] | undefined = useMemo(
    () =>
      data?.nodes.map(node => ({
        id: node.name,
        ...node,
      })),
    [data]
  );
  const pagination = { page, first, offset };
  const { localisedDateTime } = useFormatDateTime();
  const { setCurrent, setDocumentName, setDocumentType, setProgramType } =
    usePatientModalStore();

  const columns = useColumns<EncounterFragmentWithId>(
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
      data={dataWithId}
      isLoading={isLoading}
      isError={isError}
      onRowClick={row => {
        setDocumentType(row.type);
        setProgramType(row.program);
        setDocumentName(row.document.name);
        setCurrent(PatientModal.Encounter);
      }}
      noDataElement={<NothingHere />}
    />
  );
};

export const EncounterListView: FC = () => (
  <TableProvider
    createStore={createTableStore}
    queryParamsStore={createQueryParamsStore<EncounterFragmentWithId>({
      initialSortBy: { key: 'type' },
    })}
  >
    <EncounterListComponent />
  </TableProvider>
);
