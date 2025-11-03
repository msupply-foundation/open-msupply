import React, { useMemo } from 'react';
import {
  MaterialTable,
  NothingHere,
  useFormatDateTime,
  useTranslation,
  useNonPaginatedMaterialTable,
  ColumnDef,
  ChipTableCell,
  ColumnType,
} from '@openmsupply-client/common';
import {
  PatientModal,
  ProgramEnrolmentRowFragment,
  getStatusEventData,
  usePatientModalStore,
  useProgramEnrolments,
} from '@openmsupply-client/programs';
import { usePatient } from '../../api';

const programAdditionalInfoAccessor = (row: ProgramEnrolmentRowFragment) =>
  getStatusEventData(row.activeProgramEvents.nodes);

const ProgramListComponent = () => {
  const patientId = usePatient.utils.id();
  const { data, isError, isLoading } = useProgramEnrolments.document.list({
    sortBy: {
      key: 'enrolmentDatetime',
      isDesc: true,
    },
    filterBy: { patientId: { equalTo: patientId } },
  });

  const { localisedDate } = useFormatDateTime();
  const t = useTranslation();
  const { setEditModal: setEditingModal, setModal: selectModal } =
    usePatientModalStore();

  const columns: ColumnDef<ProgramEnrolmentRowFragment>[] = useMemo(
    () => [
      {
        accessorKey: 'type',
        header: t('label.enrolment-program'),
        accessorFn: (row: ProgramEnrolmentRowFragment) =>
          row.document?.documentRegistry?.name,
        enableSorting: true,
      },
      {
        accessorKey: 'programEnrolmentId',
        header: t('label.enrolment-patient-id'),
      },
      {
        accessorKey: 'events',
        header: t('label.additional-info'),
        accessorFn: (row: ProgramEnrolmentRowFragment) =>
          programAdditionalInfoAccessor(row),
        Cell: ({ cell }) => <ChipTableCell cell={cell} />,
        size: 400,
        enableSorting: false,
      },
      {
        accessorKey: 'status',
        header: t('label.program-status'),
        enableSorting: true,
      },
      {
        accessorKey: 'enrolmentDatetime',
        header: t('label.enrolment-datetime'),
        size: 175,
        align: 'right',
        columnType: ColumnType.Date,
      },
    ],
    [localisedDate]
  );

  const { table } = useNonPaginatedMaterialTable({
    tableId: 'program-enrolment-list',
    columns,
    data: data?.nodes,
    isLoading,
    isError,
    enableRowSelection: false,
    onRowClick: row => {
      setEditingModal(PatientModal.Program, row.type, row.name);
    },
    noDataElement: (
      <NothingHere
        onCreate={() => selectModal(PatientModal.ProgramSearch)}
        body={t('messages.no-programs')}
        buttonText={t('button.add-program')}
      />
    ),
  });

  return <MaterialTable table={table} />;
};

export const ProgramListView = () => <ProgramListComponent />;
