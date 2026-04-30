import React from 'react';
import {
  MaterialTable,
  NothingHere,
  useNavigate,
  RouteBuilder,
  useTranslation,
  useNonPaginatedMaterialTable,
  ColumnDef,
  ColumnType,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import {
  PatientModal,
  ProgramEnrolmentRowFragment,
  usePatientModalStore,
  useProgramEnrolments,
} from '@openmsupply-client/programs';
import { usePatient } from '../api';

const VaccinationCardListComponent = () => {
  const t = useTranslation();
  const patientId = usePatient.utils.id();
  const { data, isError, isFetching } = useProgramEnrolments.document.list({
    sortBy: {
      key: 'enrolmentDatetime',
      isDesc: true,
    },
    filterBy: {
      patientId: { equalTo: patientId },
      isImmunisationProgram: true,
    },
  });
  const navigate = useNavigate();
  const { setModal: selectModal } = usePatientModalStore();

  const columns: ColumnDef<ProgramEnrolmentRowFragment>[] = [
    {
      id: 'type',
      header: t('label.enrolment-program'),
      accessorFn: row => row?.document?.documentRegistry?.name,
      enableSorting: true,
      enableColumnFilter: true,
    },
    {
      accessorKey: 'programEnrolmentId',
      header: t('label.enrolment-patient-id'),
      enableSorting: true,
    },
    // TODO - add column for next appointment
    {
      accessorKey: 'status',
      header: t('label.program-status'),
      enableSorting: true,
      enableColumnFilter: true,
      filterVariant: 'select',
    },
    {
      accessorKey: 'enrolmentDatetime',
      header: t('label.enrolment-datetime'),
      columnType: ColumnType.Date,
      size: 175,
      enableSorting: true,
      enableColumnFilter: true,
    },
  ];

  const { table } = useNonPaginatedMaterialTable({
    tableId: 'vaccination-card-list',
    columns,
    data: data?.nodes,
    isLoading: isFetching,
    isError,
    enableRowSelection: false,
    onRowClick: row =>
      navigate(
        RouteBuilder.create(AppRoute.Dispensary)
          .addPart(AppRoute.Patients)
          .addPart(patientId)
          .addPart(AppRoute.VaccineCard)
          .addPart(row.id)
          .build()
      ),
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

export const VaccinationCardsListView = () => <VaccinationCardListComponent />;
