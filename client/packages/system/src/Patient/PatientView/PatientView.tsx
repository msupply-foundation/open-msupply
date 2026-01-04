import React, { useEffect, useState } from 'react';
import {
  DetailTabs,
  DetailViewSkeleton,
  EncounterSortFieldInput,
  ProgramEnrolmentSortFieldInput,
  useAuthContext,
  ContactTraceSortFieldInput,
  TabDefinition,
  usePreferences,
} from '@openmsupply-client/common';
import { usePatient } from '../api';
import { AppBarButtons } from './AppBarButtons';
import { PatientSummary } from './PatientSummary';
import { ProgramDetailModal, ProgramListView } from '../ProgramEnrolment';
import { CreateEncounterModal, EncounterListView } from '../Encounter';
import {
  PatientModal,
  ProgramSearchModal,
  usePatientModalStore,
  usePatientStore,
  useProgramEnrolments,
} from '@openmsupply-client/programs';
import { ContactTraceListView, CreateContactTraceModal } from '../ContactTrace';

import { VaccinationCardsListView } from '../VaccinationCard/ListView';
import { InsuranceListView, InsuranceModal } from '../Insurance';
import { PatientDetailView } from './PatientDetailView';
import { useInsuranceProviders } from '../apiModern';
import { ActivityLogList } from '../../ActivityLog';

export enum PatientTabValue {
  Details = 'details',
  Programs = 'programs',
  Encounters = 'encounters',
  ContactTracing = 'contact-tracing',
  Vaccinations = 'vaccinations',
  Insurance = 'insurance',
  ActivityLog = 'log',
}

export const PatientView = () => {
  const { current, setCreationModal, reset } = usePatientModalStore();
  const patientId = usePatient.utils.id();
  const { data } = useProgramEnrolments.document.list({
    filterBy: { patientId: { equalTo: patientId } },
  });
  const { setCurrentPatient, createNewPatient } = usePatientStore();
  const { data: currentPatient } = usePatient.document.get(patientId);
  const [isDirtyPatient, setIsDirtyPatient] = useState(false);
  const { store, storeId } = useAuthContext();
  const { showContactTracing } = usePreferences();

  const {
    query: { data: insuranceProvidersData },
  } = useInsuranceProviders();

  const requiresConfirmation = (tab: string) => {
    return tab === PatientTabValue.Details && isDirtyPatient;
  };

  useEffect(() => {
    if (!currentPatient) return;
    setCurrentPatient(currentPatient);
  }, [currentPatient, setCurrentPatient]);

  const programTabs: TabDefinition[] = [
    {
      Component: <ProgramListView />,
      value: PatientTabValue.Programs,
      sort: {
        key: ProgramEnrolmentSortFieldInput.EnrolmentDatetime,
        dir: 'desc' as 'desc' | 'asc',
      },
    },
    {
      Component: <EncounterListView />,
      value: PatientTabValue.Encounters,
      sort: {
        key: EncounterSortFieldInput.StartDatetime,
        dir: 'desc' as 'desc' | 'asc',
      },
    },
    {
      Component: <VaccinationCardsListView />,
      value: PatientTabValue.Vaccinations,
      sort: {
        key: ProgramEnrolmentSortFieldInput.EnrolmentDatetime,
        dir: 'desc' as 'desc' | 'asc',
      },
    },
  ];

  const tabs: TabDefinition[] = [
    {
      Component: (
        <PatientDetailView patientId={patientId} onEdit={setIsDirtyPatient} />
      ),
      value: PatientTabValue.Details,
      confirmOnLeaving: isDirtyPatient,
    },
  ];

  // Display program tabs only if the Program module is enabled and the patient is saved
  if (store?.preferences.omProgramModule) {
    tabs.push(...programTabs);

    // Only if program module enabled, add contact tracing tab if global pref is enabled
    if (showContactTracing) {
      tabs.push({
        Component: <ContactTraceListView />,
        value: PatientTabValue.ContactTracing,
        sort: {
          key: ContactTraceSortFieldInput.Datetime,
          dir: 'desc' as 'desc' | 'asc',
        },
      });
    }
  }

  // Display insurance tab only if insurance providers are available and the patient is saved
  if (insuranceProvidersData.length > 0)
    tabs.push({
      Component: <InsuranceListView patientId={patientId} />,
      value: PatientTabValue.Insurance,
    });

  // Add activity log tab
  tabs.push({
    Component: <ActivityLogList recordId={patientId} />,
    value: PatientTabValue.ActivityLog,
  });

  return (
    <React.Suspense fallback={<DetailViewSkeleton />}>
      <AppBarButtons disabled={!!createNewPatient} store={store} />
      <PatientSummary />
      {/* Renders specific tabs on specific cases */}
      {!createNewPatient ? (
        <DetailTabs tabs={tabs} requiresConfirmation={requiresConfirmation} />
      ) : (
        <PatientDetailView patientId={patientId} onEdit={setIsDirtyPatient} />
      )}
      {/* Note: unmount modals when not used because they have some internal
      state that shouldn't be reused across calls. */}
      {current === PatientModal.Program ? <ProgramDetailModal /> : null}
      {current === PatientModal.Encounter ? <CreateEncounterModal /> : null}
      {current === PatientModal.ProgramSearch ? (
        <ProgramSearchModal
          disabledPrograms={data?.nodes?.map(enrolment => enrolment.type)}
          open={true}
          onClose={reset}
          onChange={async documentRegistry => {
            const createDocument = {
              data: {
                enrolmentDatetime: new Date().toISOString(),
                status: 'ACTIVE',
                storeId,
              },
              schema: documentRegistry,
              isCreating: true,
            };
            setCreationModal(
              PatientModal.Program,
              documentRegistry.documentType,
              createDocument
            );
          }}
        />
      ) : null}
      {current === PatientModal.ContactTraceSearch ? (
        <CreateContactTraceModal />
      ) : null}
      {current === PatientModal.Insurance ? (
        <InsuranceModal patientName={currentPatient?.name} />
      ) : null}
    </React.Suspense>
  );
};
