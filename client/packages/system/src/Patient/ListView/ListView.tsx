import React, { useState, useMemo } from 'react';
import {
  NothingHere,
  useUrlQueryParams,
  useAuthContext,
  useNavigate,
  useCallbackWithPermission,
  UserPermission,
  useTranslation,
  getGenderTranslationKey,
  MaterialTable,
  usePaginatedMaterialTable,
  ColumnDef,
  ColumnType,
  ColumnDataAccessor,
  ChipTableCell,
  usePreferences,
} from '@openmsupply-client/common';
import { usePatient, PatientRowFragment } from '../api';
import { AppBarButtons } from './AppBarButtons';
import { usePatientStore } from '@openmsupply-client/programs';
import { CreatePatientModal } from '../CreatePatientModal';
import { PatientColumnData } from '../CreatePatientModal/PatientResultsTab';

// TODO: REMOVE. KEEPING FOR LINK PATIENT MODAL USAGE
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

export const PatientListView = () => {
  const t = useTranslation();
  const { genderOptions } = usePreferences();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const {
    queryParams: { sortBy, filterBy, first, offset },
  } = useUrlQueryParams({
    initialSort: { key: 'createdDatetime', dir: 'desc' },
    filters: [
      {
        key: 'dateOfBirth',
        condition: 'between',
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

  const { setDocumentName, createNewPatient } = usePatientStore();

  const { data, isError, isFetching } = usePatient.document.list(queryParams);
  const navigate = useNavigate();

  const columns = useMemo(
    (): ColumnDef<PatientRowFragment>[] => [
      {
        accessorKey: 'code',
        header: t('label.patient-id'),
        enableSorting: true,
        size: 120,
      },
      {
        accessorKey: 'code2',
        header: t('label.patient-nuic'),
        enableSorting: true,
        size: 120,
      },
      {
        accessorKey: 'createdDatetime',
        header: t('label.created'),
        enableSorting: true,
        columnType: ColumnType.Date,
        size: 150,
      },
      {
        accessorKey: 'firstName',
        header: t('label.first-name'),
        enableSorting: true,
        enableColumnFilter: true,
        size: 150,
      },
      {
        accessorKey: 'lastName',
        header: t('label.last-name'),
        enableSorting: true,
        enableColumnFilter: true,
        size: 150,
      },
      {
        id: 'gender',
        header: t('label.gender'),
        accessorFn: row =>
          row.gender ? t(getGenderTranslationKey(row.gender)) : '',
        enableSorting: true,
        enableColumnFilter: true,
        size: 120,
        filterVariant: 'select',
        filterSelectOptions: genderOptions?.map(gender => ({
          value: gender,
          label: t(getGenderTranslationKey(gender)),
        })),
      },
      {
        accessorKey: 'dateOfBirth',
        header: t('label.date-of-birth'),
        columnType: ColumnType.Date,
        enableSorting: true,
        enableColumnFilter: true,
        dateFilterFormat: 'date',
        size: 150,
      },
      {
        accessorKey: 'nextOfKinName',
        header: t('label.next-of-kin'),
        size: 150,
        enableColumnFilter: true,
      },
      {
        accessorKey: 'programEnrolmentName',
        header: t('label.program-enrolments'),
        accessorFn: (row: PatientRowFragment) =>
          row.programEnrolments.nodes.map(it => {
            const programEnrolmentId = it.programEnrolmentId
              ? ` (${it.programEnrolmentId})`
              : '';
            return `${it.document.documentRegistry?.name}${programEnrolmentId}`;
          }),
        Cell: ChipTableCell,
        enableColumnFilter: true,
        size: 250,
        includeColumn: store?.preferences.omProgramModule,
      },
      {
        header: t('label.deceased'),
        accessorKey: 'isDeceased',
        columnType: ColumnType.Boolean,
        enableSorting: false,
        size: 80,
        align: 'center',
      },
    ],
    [store?.preferences.omProgramModule]
  );

  const { table } = usePaginatedMaterialTable({
    tableId: 'patient-list',
    columns,
    data: data?.nodes,
    totalCount: data?.totalCount ?? 0,
    isLoading: isFetching,
    isError,
    onRowClick: row => {
      setDocumentName(row.document?.name);
      navigate(String(row.id));
    },
    noDataElement: (
      <NothingHere body={t('error.no-patients')} onCreate={handleClick} />
    ),
    enableRowSelection: false,
  });

  const onCreatePatient = () => {
    setCreateModalOpen(false);
    if (!createNewPatient) return;
    navigate(createNewPatient?.id);
  };

  const onSelectPatient = (selectedPatient: PatientColumnData) => {
    navigate(selectedPatient.id);
  };

  return (
    <>
      <AppBarButtons
        sortBy={sortBy}
        onCreatePatient={onCreatePatient}
        onSelectPatient={onSelectPatient}
      />
      <MaterialTable table={table} />
      {createModalOpen ? (
        <CreatePatientModal
          open={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          onCreate={onCreatePatient}
          onSelectPatient={selectedPatient => {
            onSelectPatient(selectedPatient);
          }}
        />
      ) : null}
    </>
  );
};
