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
  InsertPatientInput,
  ContactTraceSortFieldInput,
  UpdatePatientInput,
  BasicSpinner,
  DocumentRegistryCategoryNode,
  useNavigate,
} from '@openmsupply-client/common';
import { usePatient } from '../api';
import { AppBarButtons } from './AppBarButtons';
import { PatientSummary } from './PatientSummary';
import { ProgramDetailModal, ProgramListView } from '../ProgramEnrolment';
import { CreateEncounterModal, EncounterListView } from '../Encounter';
import {
  JsonFormData,
  FormInputData,
  PatientModal,
  ProgramSearchModal,
  SaveDocumentMutation,
  SavedDocument,
  SchemaData,
  useDocumentRegistry,
  useJsonForms,
  usePatientModalStore,
  usePatientStore,
  useProgramEnrolments,
} from '@openmsupply-client/programs';
import { Footer } from './Footer';
import { ContactTraceListView, CreateContactTraceModal } from '../ContactTrace';

import defaultPatientSchema from '../DefaultPatientSchema.json';
import defaultPatientUISchema from '../DefaultPatientUISchema.json';

const DEFAULT_SCHEMA: SchemaData = {
  formSchemaId: undefined,
  jsonSchema: defaultPatientSchema,
  uiSchema: defaultPatientUISchema,
};

const useUpsertPatient = (
  create: boolean
): ((input: unknown) => Promise<void>) => {
  const { mutateAsync: insertPatient } = usePatient.document.insert();
  const { mutateAsync: updatePatient } = usePatient.document.update();
  return async (input: unknown) => {
    if (create) {
      await insertPatient(input as InsertPatientInput);
    } else {
      await updatePatient(input as UpdatePatientInput);
    }
  };
};

const useUpsertProgramPatient = (): SaveDocumentMutation => {
  const { mutateAsync: insertPatient } =
    usePatient.document.insertProgramPatient();
  const { mutateAsync: updatePatient } =
    usePatient.document.updateProgramPatient();
  return async (jsonData: unknown, schemaId: string, parent?: string) => {
    if (parent === undefined) {
      const result = await insertPatient({
        data: jsonData,
        schemaId,
      });
      if (!result.document) throw Error('Inserted document not set!');
      return result.document;
    } else {
      const result = await updatePatient({
        data: jsonData,
        parent,
        schemaId,
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
  const { data: currentPatient, isLoading: isCurrentPatientLoading } =
    usePatient.document.get(patientId);
  const { data: patientRegistries, isLoading: isPatientRegistryLoading } =
    useDocumentRegistry.get.documentRegistries({
      filter: {
        category: { equalTo: DocumentRegistryCategoryNode.Patient },
      },
    });
  const isLoading = isCurrentPatientLoading || isPatientRegistryLoading;
  const navigate = useNavigate();

  const patientRegistry = patientRegistries?.nodes[0];
  const isCreatingPatient = !!createNewPatient;
  // we have to memo the data to avoid an infinite render loop
  const inputData = useMemo<FormInputData | undefined>(() => {
    if (!!createNewPatient) {
      // Use the unsaved patient information from createNewPatient, i.e. from a "create patient"
      // request
      return {
        schema: patientRegistry ?? DEFAULT_SCHEMA,
        data: {
          id: createNewPatient.id,
          code: createNewPatient.code,
          code2: createNewPatient.code2,
          firstName: createNewPatient.firstName,
          lastName: createNewPatient.lastName,
          gender: createNewPatient.gender,
          dateOfBirth: createNewPatient.dateOfBirth,
          phone: createNewPatient.phone,
          address1: createNewPatient.address1,
          isDeceased: createNewPatient.isDeceased,
          dateOfDeath: createNewPatient.dateOfDeath,
        },
        isCreating: true,
      };
    } else if (!!currentPatient && !currentPatient.document) {
      // The loaded patient doesn't has a document. Use the information we got (from the name
      // table).
      return {
        schema: patientRegistry ?? DEFAULT_SCHEMA,
        data: {
          id: currentPatient.id,
          code: currentPatient.code,
          code2: currentPatient.code2 ?? undefined,
          firstName: currentPatient.firstName ?? undefined,
          lastName: currentPatient.lastName ?? undefined,
          gender: currentPatient.gender ?? undefined,
          dateOfBirth: currentPatient.dateOfBirth ?? undefined,
          dateOfDeath: currentPatient.dateOfDeath ?? undefined,
          isDeceased: currentPatient.isDeceased ?? undefined,
          phone: currentPatient.phone ?? undefined,
          address1: currentPatient.address1 ?? undefined,
        },
        isCreating: false,
      };
    } else if (currentPatient?.document) {
      // Take the data from the document
      return {
        schema: patientRegistry ?? DEFAULT_SCHEMA,
        data: currentPatient.documentDraft,
        isCreating: false,
      };
    }
  }, [createNewPatient, currentPatient, patientRegistry]);

  const handleProgramPatientSave = useUpsertProgramPatient();
  const handlePatientSave = useUpsertPatient(isCreatingPatient);

  const accessor: JsonFormData<SavedDocument | void> = patientRegistry
    ? {
        loadedData: inputData?.data,
        isLoading: false,
        error: undefined,
        isCreating: isCreatingPatient,
        schema: patientRegistry,
        save: async (data: unknown) => {
          await handleProgramPatientSave(
            data,
            patientRegistry.formSchemaId,
            currentPatient?.document?.id
          );
        },
      }
    : {
        loadedData: inputData?.data,
        isLoading: false,
        error: undefined,
        isCreating: isCreatingPatient,
        schema: DEFAULT_SCHEMA,
        save: async (data: unknown) => {
          await handlePatientSave(data);
        },
      };

  const { JsonForm, saveData, isSaving, isDirty, validationError } =
    useJsonForms(
      {
        documentName: createNewPatient ? undefined : documentName,
        patientId: patientId,
      },
      accessor
    );

  useEffect(() => {
    return () => setCreateNewPatient(undefined);
  }, [setCreateNewPatient]);

  const save = useCallback(async () => {
    const savedDocument = await saveData();
    // patient has been created => unset the create request data
    setCreateNewPatient(undefined);
    if (savedDocument) {
      setDocumentName(savedDocument.name);
    }
  }, [saveData, setCreateNewPatient, setDocumentName]);

  useEffect(() => {
    if (!documentName && currentPatient) {
      setDocumentName(currentPatient?.document?.name);
    }
  }, [currentPatient, documentName, setDocumentName]);

  useEffect(() => {
    onEdit(isDirty);
  }, [isDirty, onEdit]);

  const showSaveConfirmation = useConfirmationModal({
    onConfirm: save,
    message: t('messages.confirm-save-generic'),
    title: t('heading.are-you-sure'),
  });

  const showCancelConfirmation = useConfirmationModal({
    onConfirm: () => {
      navigate(-1);
    },
    message: t('messages.confirm-cancel-generic'),
    title: t('heading.are-you-sure'),
  });

  if (isLoading) return <BasicSpinner />;

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
        showCancelConfirmation={showCancelConfirmation}
      />
    </Box>
  );
};

export enum PatientTabValue {
  Details = 'Details',
  Programs = 'Programs',
  Encounters = 'Encounters',
  ContactTracing = 'Contact Tracing',
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
  }, [currentPatient, setCurrentPatient]);

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
      value: PatientTabValue.ContactTracing,
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
