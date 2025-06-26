import React, { useState } from 'react';
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
  useCallbackWithPermission,
  UserPermission,
  useTranslation,
  getGenderTranslationKey,
} from '@openmsupply-client/common';
import { usePatient, PatientRowFragment } from '../api';
import { AppBarButtons } from './AppBarButtons';
import { Toolbar } from './Toolbar';
import {
  CreateNewPatient,
  usePatientStore,
} from '@openmsupply-client/programs';
import { ChipTableCell } from '../Components';
import { CreatePatientModal } from '../CreatePatientModal';

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

const PatientListComponent = () => {
  const t = useTranslation();
  const [createModalOpen, setCreateModalOpen] = useState(false);
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
      { key: 'nextOfKinName' },
    ],
  });
  const { store } = useAuthContext();
  const queryParams = {
    filterBy,
    offset,
    first,
    sortBy,
  };

  const handleClick = useCallbackWithPermission(
    UserPermission.PatientMutate,
    () => setCreateModalOpen(true)
  );

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
      accessor: ({ rowData }) =>
        rowData.gender ? t(getGenderTranslationKey(rowData.gender)) : '',
    },
    {
      key: 'dateOfBirth',
      label: 'label.date-of-birth',
      formatter: dateString =>
        dateString ? localisedDate((dateString as string) || '') : '',
    },
    {
      key: 'nextOfKinName',
      label: 'label.next-of-kin',
      sortable: false,
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

  const onCreatePatient = (newPatient: CreateNewPatient) => {
    navigate(newPatient.id);
  };

  const onSelectPatient = (selectedPatient: string) => {
    navigate(selectedPatient);
  };

  return (
    <>
      <Toolbar filter={filter} />
      <AppBarButtons
        sortBy={sortBy}
        onCreatePatient={onCreatePatient}
        onSelectPatient={onSelectPatient}
      />
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
        noDataElement={
          <NothingHere body={t('error.no-patients')} onCreate={handleClick} />
        }
      />
      {createModalOpen ? (
        <CreatePatientModal
          onClose={() => setCreateModalOpen(false)}
          onCreatePatient={newPatient => {
            onCreatePatient(newPatient);
          }}
          onSelectPatient={selectedPatient => {
            onSelectPatient(selectedPatient);
          }}
        />
      ) : null}
    </>
  );
};

export const PatientListView = () => (
  <TableProvider createStore={createTableStore}>
    <PatientListComponent />
  </TableProvider>
);
