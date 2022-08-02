import React, { FC, useMemo } from 'react';
import {
  TableProvider,
  DataTable,
  useColumns,
  createTableStore,
  NothingHere,
  createQueryParamsStore,
  useFormatDateTime,
  ColumnAlign,
  useUrlQueryParams,
  useNavigate,
} from '@openmsupply-client/common';
import { ProgramFragment, useProgramEnrolment } from './api';

type ProgramFragmentWithId = { id: string } & ProgramFragment;

const ProgramListComponent: FC = () => {
  const {
    updateSortQuery,
    updatePaginationQuery,
    queryParams: { sortBy, page, first, offset },
  } = useUrlQueryParams();
  const { data, isError, isLoading } = useProgramEnrolment.document.list();
  const dataWithId: ProgramFragmentWithId[] | undefined = useMemo(
    () =>
      data?.nodes.map(node => ({
        id: node.name,
        ...node,
      })),
    [data]
  );
  const pagination = { page, first, offset };
  const { localisedDate } = useFormatDateTime();

  const columns = useColumns<ProgramFragmentWithId>(
    [
      {
        key: 'type',
        label: 'label.enrolment-program',
      },
      {
        key: 'programPatientId',
        label: 'label.enrolment-patient-id',
      },
      {
        key: 'enrolmentDatetime',
        label: 'label.enrolment-datetime',
        align: ColumnAlign.Right,
        width: 175,
        formatter: dateString =>
          dateString ? localisedDate((dateString as string) || '') : '',
      },
    ],
    { onChangeSortBy: updateSortQuery, sortBy },
    [sortBy]
  );
  const navigate = useNavigate();

  return (
    <DataTable
      key="program-enrolment-list"
      pagination={{ ...pagination, total: data?.totalCount }}
      onChangePage={updatePaginationQuery}
      columns={columns}
      data={dataWithId}
      isLoading={isLoading}
      isError={isError}
      onRowClick={row => {
        navigate(
          `${row.type}?doc=${row.document.name}&patientId=${row.patientId}&type=${row.type}`
        );
      }}
      noDataElement={<NothingHere />}
    />
  );
};

export const ProgramListView: FC = () => (
  <TableProvider
    createStore={createTableStore}
    queryParamsStore={createQueryParamsStore<ProgramFragmentWithId>({
      initialSortBy: { key: 'type' },
    })}
  >
    <ProgramListComponent />
  </TableProvider>
);
