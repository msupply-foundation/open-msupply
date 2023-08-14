import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DetailTabs,
  DetailViewSkeleton,
  useConfirmationModal,
  Box,
  useTranslation,
  EncounterSortFieldInput,
  ProgramEnrolmentSortFieldInput,
  useAuthContext,
  ContactTraceSortFieldInput,
} from '@openmsupply-client/common';
import { usePatient } from '../api';
import { AppBarButtons } from './AppBarButtons';
import { PatientSummary } from './PatientSummary';
import { ProgramDetailModal, ProgramListView } from '../ProgramEnrolment';
import { CreateEncounterModal, EncounterListView } from '../Encounter';
import {
  FormInputData,
  PatientModal,
  ProgramSearchModal,
  SaveDocumentMutation,
  useDocumentRegistry,
  useJsonForms,
  usePatientModalStore,
  usePatientStore,
  useProgramEnrolments,
} from '@openmsupply-client/programs';
import { Footer } from './Footer';
import { ContactTraceListView, CreateContactTraceModal } from '../ContactTrace';

const useUpsertPatient = (): SaveDocumentMutation => {
  const { mutateAsync: insertPatient } = usePatient.document.insert();
  const { mutateAsync: updatePatient } = usePatient.document.update();
  return async (jsonData: unknown, formSchemaId: string, parent?: string) => {
    if (parent === undefined) {
      const result = await insertPatient({
        data: jsonData,
        schemaId: formSchemaId,
      });
      if (!result.document) throw Error('Inserted document not set!');
      return result.document;
    } else {
      const result = await updatePatient({
        data: jsonData,
        parent,
        schemaId: formSchemaId,
      });
      if (!result.document) throw Error('Inserted document not set!');
      return result.document;
    }
  };
};

const PatientDetailView = ({
  onEdit,
}: {
  onEdit: (isDirty: boolean) => void;
}) => {
  const t = useTranslation('dispensary');
  const {
    documentName,
    setDocumentName,
    createNewPatient,
    setCreateNewPatient,
  } = usePatientStore();
  const patientId = usePatient.utils.id();
  const { data: currentPatient } = usePatient.document.get(patientId);

  const { data: patientRegistries } =
    useDocumentRegistry.get.documentRegistries({
      filter: {
        documentType: { equalTo: 'Patient' },
      },
    });
  const patientRegistry = patientRegistries?.nodes[0];

  // we have to memo createDoc to avoid an infinite render loop
  const inputData = useMemo<FormInputData | undefined>(() => {
    if (createNewPatient) {
      return {
        schema: createNewPatient.documentRegistry,
        data: {
          id: createNewPatient.id,
          code: createNewPatient.code,
          code2: createNewPatient.code2,
          firstName: createNewPatient.firstName,
          lastName: createNewPatient.lastName,
          gender: createNewPatient.gender,
          dateOfBirth: createNewPatient.dateOfBirth,
          addresses: [],
          contactDetails: [],
          socioEconomics: {},
          isDeceased: false,
        },
        isCreating: true,
      };
    } else if (
      !!patientRegistry &&
      !!currentPatient &&
      !currentPatient.document
    ) {
      // no document associated with the patient; use data from the Name row
      return {
        schema: {
          formSchemaId: patientRegistry.formSchemaId,
          jsonSchema: patientRegistry.jsonSchema,
          uiSchema: patientRegistry.uiSchema,
        },
        data: {
          id: currentPatient.id,
          code: currentPatient.code,
          code2: currentPatient.code2 ?? undefined,
          firstName: currentPatient.firstName ?? undefined,
          lastName: currentPatient.lastName ?? undefined,
          gender: currentPatient.gender ?? undefined,
          dateOfBirth: currentPatient.dateOfBirth ?? undefined,
          addresses: [],
          contactDetails: [],
          socioEconomics: {},
          isDeceased: false,
        },
        isCreating: false,
      };
    } else return undefined;
  }, [createNewPatient, currentPatient, patientRegistry]);

  const handleSave = useUpsertPatient();
  const { JsonForm, saveData, isSaving, isDirty, validationError } =
    useJsonForms(
      createNewPatient ? undefined : documentName,
      patientId,
      { handleSave },
      inputData
    );

  useEffect(() => {
    return () => setCreateNewPatient(undefined);
  }, []);

  const save = useCallback(async () => {
    const documentName = await saveData();
    if (documentName) {
      setDocumentName(documentName);
      // patient has been created => unset the create request data
      setCreateNewPatient(undefined);
    }
  }, [saveData]);

  useEffect(() => {
    if (!documentName && currentPatient) {
      setDocumentName(currentPatient?.document?.name);
    }
  }, [currentPatient]);

  useEffect(() => {
    onEdit(isDirty);
  }, [isDirty]);

  const showSaveConfirmation = useConfirmationModal({
    onConfirm: save,
    message: t('messages.confirm-save-generic'),
    title: t('heading.are-you-sure'),
  });

  return (
    <Box flex={1} display="flex" justifyContent="center">
      <Box style={{ maxWidth: 1200, flex: 1 }}>{JsonForm}</Box>
      <Footer
        documentName={documentName}
        isSaving={isSaving}
        isDirty={isDirty}
        validationError={validationError}
        inputData={inputData}
        showSaveConfirmation={showSaveConfirmation}
      />
    </Box>
  );
};

export enum PatientTabValue {
  Details = 'Details',
  Programs = 'Programs',
  Encounters = 'Encounters',
  ContactTraces = 'Contact Traces',
}

/**
 * Main patient view containing patient details and program tabs
 */
export const PatientView = () => {
  const { current, setCreationModal, reset } = usePatientModalStore();
  const patientId = usePatient.utils.id();
  const { data } = useProgramEnrolments.document.list({
    filterBy: { patientId: { equalTo: patientId } },
  });
  const { setCurrentPatient, createNewPatient } = usePatientStore();
  const { data: currentPatient } = usePatient.document.get(patientId);
  const [isDirtyPatient, setIsDirtyPatient] = useState(false);
  const { store } = useAuthContext();

  const requiresConfirmation = (tab: string) => {
    return tab === PatientTabValue.Details && isDirtyPatient;
  };

  useEffect(() => {
    if (!currentPatient) return;
    setCurrentPatient(currentPatient);
  }, [currentPatient]);

  const tabs = [
    {
      Component: <PatientDetailView onEdit={setIsDirtyPatient} />,
      value: PatientTabValue.Details,
      confirmOnLeaving: isDirtyPatient,
    },
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
      Component: <ContactTraceListView />,
      value: PatientTabValue.ContactTraces,
      sort: {
        key: ContactTraceSortFieldInput.Datetime,
        dir: 'desc' as 'desc' | 'asc',
      },
    },
  ];

  // Note: unmount modals when not used because they have some internal state
  // that shouldn't be reused across calls.
  return (
    <React.Suspense fallback={<DetailViewSkeleton />}>
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

      <AppBarButtons disabled={!!createNewPatient} store={store} />
      <PatientSummary />
      {/* Only show tabs if program module is on and patient is saved.
      TODO: Prescription tab? - would need tab refactoring since also seems useful in programs
      */}
      {!createNewPatient && store?.preferences.omProgramModule ? (
        <DetailTabs tabs={tabs} requiresConfirmation={requiresConfirmation} />
      ) : (
        <PatientDetailView onEdit={setIsDirtyPatient} />
      )}
    </React.Suspense>
  );
};
