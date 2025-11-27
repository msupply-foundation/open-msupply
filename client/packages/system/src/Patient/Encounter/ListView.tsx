import React from 'react';
import {
  MaterialTable,
  NothingHere,
  useNavigate,
  RouteBuilder,
  useTranslation,
  useNonPaginatedMaterialTable,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import {
  EncounterFragmentWithStatus,
  useEncounterFragmentWithStatus,
} from '../../Encounter';
import { useEncounterListColumns } from '../../Encounter/ListView/columns';
import {
  useEncounter,
  PatientModal,
  usePatientModalStore,
  useProgramEnrolments,
} from '@openmsupply-client/programs';
import { usePatient } from '../api';

export const EncounterListView = () => {
  const t = useTranslation();
  const patientId = usePatient.utils.id();
  const { data, isError, isFetching } = useEncounter.document.list({
    sortBy: {
      key: 'startDatetime',
      isDesc: true,
      direction: 'desc',
    },
    filterBy: { patientId: { equalTo: patientId } },
  });
  const dataWithStatus: EncounterFragmentWithStatus[] | undefined =
    useEncounterFragmentWithStatus(data?.nodes);
  const navigate = useNavigate();
  const { setModal: selectModal } = usePatientModalStore();
  const { data: enrolmentData } = useProgramEnrolments.document.list({
    filterBy: {
      patientId: { equalTo: patientId },
    },
  });
  const disableEncounterButton = enrolmentData?.nodes?.length === 0;

  const columns = useEncounterListColumns({});

  const { table } = useNonPaginatedMaterialTable({
    tableId: 'single-patient-encounter-list',
    columns,
    data: dataWithStatus,
    isLoading: isFetching,
    isError,
    enableRowSelection: false,
    onRowClick: row => {
      navigate(
        RouteBuilder.create(AppRoute.Dispensary)
          .addPart(AppRoute.Encounter)
          .addPart(row.id)
          .build()
      );
    },
    noDataElement: (
      <NothingHere
        onCreate={
          disableEncounterButton
            ? undefined
            : () => selectModal(PatientModal.Encounter)
        }
        body={t('messages.no-encounters')}
        buttonText={t('button.add-encounter')}
      />
    ),
  });

  return <MaterialTable table={table} />;
};
