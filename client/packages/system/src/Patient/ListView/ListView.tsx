import React, { FC } from 'react';
import {
  TableProvider,
  DataTable,
  useColumns,
  createTableStore,
  NothingHere,
  useFormatDateTime,
  ColumnAlign,
  useUrlQueryParams,
  DotCell,
  ColumnDataAccessor,
  useAuthContext,
  useNavigate,
  ColumnDescription,
} from '@openmsupply-client/common';
import { usePatient, PatientRowFragment } from '../api';
import { AppBarButtons } from './AppBarButtons';
import { Toolbar } from './Toolbar';
import { usePatientStore } from '@openmsupply-client/programs';
import { ChipTableCell } from '../Components';

export const programEnrolmentLabelAccessor: ColumnDataAccessor<
  PatientRowFragment,
  string[]
> = ({ rowData }): string[] => {
  return rowData.programEnrolments.nodes.map(it => {
    const programEnrolmentId = it.programEnrolmentId
      ? ` (${it.programEnrolmentId})`
      : '';
    return `${it.document.documentRegistry?.name}${programEnrolmentId}`;
  });
};

const PatientListComponent: FC = () => {
  const {
    updateSortQuery,
    updatePaginationQuery,
    filter,
    queryParams: { page, first, offset, sortBy, filterBy },
  } = useUrlQueryParams({
    initialSort: { key: 'createdDatetime', dir: 'desc' },
    filters: [
      {
        key: 'dateOfBirth',
        condition: 'equalTo',
      },
      {
        key: 'gender',
        condition: 'equalTo',
      },
      { key: 'firstName' },
      { key: 'identifier' },
      { key: 'lastName' },
      { key: 'programEnrolmentName' },
    ],
  });
  const { store } = useAuthContext();
  const queryParams = {
    filterBy,
    offset,
    first,
    sortBy,
  };

  const { setDocumentName } = usePatientStore();

  const { data, isError, isLoading } = usePatient.document.list(queryParams);
  const pagination = { page, first, offset };

  const { localisedDate } = useFormatDateTime();
  const navigate = useNavigate();

  const columnDefinitions: ColumnDescription<PatientRowFragment>[] = [
    { key: 'code', label: 'label.patient-id' },
    { key: 'code2', label: 'label.patient-nuic' },
    {
      key: 'createdDatetime',
      label: 'label.created',
      formatter: dateString =>
        dateString ? localisedDate((dateString as string) || '') : '',
      sortable: true,
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
      key: 'dateOfBirth',
      label: 'label.date-of-birth',
      formatter: dateString =>
        dateString ? localisedDate((dateString as string) || '') : '',
    },
  ];

  if (store?.preferences.omProgramModule) {
    columnDefinitions.push({
      label: 'label.program-enrolments',
      key: 'programEnrolments',
      sortable: false,
      accessor: programEnrolmentLabelAccessor,
      Cell: ChipTableCell,
      maxWidth: 250,
    });
  }

  columnDefinitions.push({
    key: 'isDeceased',
    label: 'label.deceased',
    align: ColumnAlign.Center,
    Cell: DotCell,
    sortable: false,
  });

  const columns = useColumns<PatientRowFragment>(
    columnDefinitions,
    {
      onChangeSortBy: updateSortQuery,
      sortBy,
    },
    [updateSortQuery, sortBy]
  );

  return (
    <>
      <Toolbar filter={filter} />
      <AppBarButtons sortBy={sortBy} />
      <DataTable
        id="patients"
        pagination={{ ...pagination, total: data?.totalCount ?? 0 }}
        onChangePage={updatePaginationQuery}
        columns={columns}
        data={data?.nodes}
        isLoading={isLoading}
        isError={isError}
        onRowClick={row => {
          setDocumentName(row.document?.name);
          navigate(String(row.id));
        }}
        noDataElement={<NothingHere />}
      />
    </>
  );
};

export const PatientListView: FC = () => (
  <TableProvider createStore={createTableStore}>
    <PatientListComponent />
  </TableProvider>
);
