import React, { FC } from 'react';
import {
  TableProvider,
  DataTable,
  createTableStore,
  NothingHere,
  useNavigate,
  RouteBuilder,
  useUrlQueryParams,
  useTranslation,
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
import { PatientTabValue } from '../PatientView/PatientView';

const EncounterListComponent: FC = () => {
  const t = useTranslation();
  const {
    queryParams: { sortBy, page, first, offset, filterBy },
    updatePaginationQuery,
    updateSortQuery,
  } = useUrlQueryParams({ initialSort: { key: 'startDatetime', dir: 'desc' } });

  const patientId = usePatient.utils.id();
  const { data, isError, isLoading } = useEncounter.document.list({
    pagination: { first, offset },
    // enforce filtering by patient id
    filterBy: { ...filterBy, patientId: { equalTo: patientId } },
    sortBy,
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

  const columns = useEncounterListColumns({
    onChangeSortBy: updateSortQuery,
    sortBy,
  });

  return (
    <DataTable
      id="encounter-list"
      pagination={{ page, first, offset, total: data?.totalCount }}
      onChangePage={updatePaginationQuery}
      columns={columns}
      data={dataWithStatus}
      isLoading={isLoading}
      isError={isError}
      onRowClick={row => {
        navigate(
          RouteBuilder.create(AppRoute.Dispensary)
            .addPart(AppRoute.Encounter)
            .addPart(row.id)
            .addQuery({ tab: PatientTabValue.Encounters })
            .build()
        );
      }}
      noDataElement={
        <NothingHere
          onCreate={
            disableEncounterButton
              ? undefined
              : () => selectModal(PatientModal.Encounter)
          }
          body={t('messages.no-encounters')}
          buttonText={t('button.add-encounter')}
        />
      }
    />
  );
};

export const EncounterListView: FC = () => (
  <TableProvider createStore={createTableStore}>
    <EncounterListComponent />
  </TableProvider>
);
