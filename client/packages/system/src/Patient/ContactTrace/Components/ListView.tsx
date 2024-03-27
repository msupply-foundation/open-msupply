import React, { FC } from 'react';
import {
  TableProvider,
  DataTable,
  createTableStore,
  NothingHere,
  useUrlQueryParams,
  ContactTraceSortFieldInput,
  useNavigate,
  RouteBuilder,
  useColumns,
  ColumnAlign,
  SortBy,
  ColumnDescription,
} from '@openmsupply-client/common';
import { useContactTraces } from '@openmsupply-client/programs';
import { usePatient } from '../../api';
import { createQueryParamsStore, useQueryParamsStore } from '@common/hooks';
import { ContactTraceRowFragment } from '@openmsupply-client/programs';
import { useFormatDateTime } from '@common/intl';
import { AppRoute } from '@openmsupply-client/config';

interface ContactTraceListColumnsProps {
  onChangeSortBy: (sort: string, dir: 'desc' | 'asc') => void;
  sortBy: SortBy<ContactTraceRowFragment>;
}

const useContactTraceListColumns = ({
  onChangeSortBy,
  sortBy,
}: ContactTraceListColumnsProps) => {
  const { localisedDate } = useFormatDateTime();

  const columnList: ColumnDescription<ContactTraceRowFragment>[] = [
    {
      key: 'programName',
      label: 'label.program',
      accessor: ({ rowData }) => rowData.program.name,
      sortable: false,
    },
    {
      key: 'datetime',
      label: 'label.date-created',
      formatter: dateString =>
        dateString ? localisedDate((dateString as string) || '') : '',
    },
    {
      key: 'firstName',
      label: 'label.first-name',
    },
    {
      key: 'lastName',
      label: 'label.last-name',
    },
    {
      key: 'gender',
      label: 'label.gender',
    },
    {
      key: 'relationship',
      label: 'label.relationship',
      sortable: false,
    },
    {
      key: 'dateOfBirth',
      label: 'label.age',
      align: ColumnAlign.Right,
      width: 175,
      accessor: ({ rowData }) => rowData.age,
    },
  ];

  const columns = useColumns<ContactTraceRowFragment>(
    columnList,
    {
      sortBy,
      onChangeSortBy,
    },
    [sortBy, onChangeSortBy]
  );

  return columns;
};

const ContactTraceComponent: FC = () => {
  const {
    sort: { sortBy, onChangeSortBy },
    pagination: { page, first, offset, onChangePage },
  } = useQueryParamsStore();

  const { queryParams } = useUrlQueryParams();

  const patientId = usePatient.utils.id();

  const { data, isError, isLoading } = useContactTraces.document.list({
    ...queryParams,
    sortBy: {
      key: sortBy.key as ContactTraceSortFieldInput,
      isDesc: sortBy.isDesc,
    },
    filterBy: { patientId: { equalTo: patientId } },
  });
  const pagination = { page, first, offset };
  const navigate = useNavigate();

  const columns = useContactTraceListColumns({
    sortBy,
    onChangeSortBy,
  });

  return (
    <DataTable
      id="contact-trace-list"
      pagination={{ ...pagination, total: data?.totalCount }}
      onChangePage={onChangePage}
      columns={columns}
      data={data?.nodes}
      isLoading={isLoading}
      isError={isError}
      onRowClick={row => {
        navigate(
          RouteBuilder.create(AppRoute.Dispensary)
            .addPart(AppRoute.ContactTrace)
            .addPart(row.id)
            .build()
        );
      }}
      noDataElement={<NothingHere />}
    />
  );
};

export const ContactTraceListView: FC = () => (
  <TableProvider
    createStore={createTableStore}
    queryParamsStore={createQueryParamsStore<ContactTraceRowFragment>({
      initialSortBy: {
        key: ContactTraceSortFieldInput.Datetime,
        isDesc: false,
      },
    })}
  >
    <ContactTraceComponent />
  </TableProvider>
);
