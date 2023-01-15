import React, { FC, useCallback, useEffect, useMemo } from 'react';
import {
  DetailTabs,
  DetailViewSkeleton,
  useConfirmationModal,
  Box,
  useTranslation,
} from '@openmsupply-client/common';
import { usePatient } from '../api';
import { AppBarButtons } from './AppBarButtons';
import { PatientSummary } from './PatientSummary';
import { ProgramDetailModal, ProgramListView } from '../ProgramEnrolment';
import { CreateEncounterModal, EncounterListView } from '../Encounter';
import {
  PatientModal,
  ProgramSearchModal,
  SaveDocumentMutation,
  useJsonForms,
  usePatientCreateStore,
  usePatientModalStore,
  usePatientStore,
  useProgramEnrolments,
} from '@openmsupply-client/programs';
import { Footer } from './Footer';

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

const PatientDetailView: FC = () => {
  const t = useTranslation('patients');
  const { documentName, setDocumentName } = usePatientStore();
  const { patient, setNewPatient } = usePatientCreateStore();
  const patientId = usePatient.utils.id();
  const { data: currentPatient } = usePatient.document.get(patientId);

  // we have to memo createDoc to avoid an infinite render loop
  const createDoc = useMemo(() => {
    if (patient) {
      return {
        documentRegistry: patient.documentRegistry,
        data: {
          id: patient.id,
          code: patient.code,
          code2: patient.code2,
          firstName: patient.firstName,
          lastName: patient.lastName,
          gender: patient.gender,
          dateOfBirth: patient.dateOfBirth,
          addresses: [],
          contactDetails: [],
          socioEconomics: {},
          isDeceased: false,
        },
      };
    } else return undefined;
  }, [patient]);

  const handleSave = useUpsertPatient();
  const { JsonForm, saveData, isSaving, isDirty, validationError } =
    useJsonForms(patient ? undefined : documentName, { handleSave }, createDoc);
  useEffect(() => {
    return () => setNewPatient(undefined);
  }, []);
  const save = useCallback(async () => {
    const documentName = await saveData();
    if (documentName) {
      setDocumentName(documentName);
      // patient has been created => unset the create request data
      setNewPatient(undefined);
    }
  }, [saveData]);

  useEffect(() => {
    if (!documentName && currentPatient) {
      setDocumentName(currentPatient?.document?.name);
    }
  }, [currentPatient]);

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
        createDoc={createDoc}
        showSaveConfirmation={showSaveConfirmation}
      />
    </Box>
  );
};

export const PatientView: FC = () => {
  const { current, setCreationModal, reset } = usePatientModalStore();
  const patientId = usePatient.utils.id();
  const { data } = useProgramEnrolments.document.programEnrolments({
    filterBy: { patientId: { equalTo: patientId } },
  });
  const { patient } = usePatientCreateStore();

  const tabs = [
    {
      Component: <PatientDetailView />,
      value: 'Details',
    },
    {
      Component: <ProgramListView />,
      value: 'Programs',
    },
    {
      Component: <EncounterListView />,
      value: 'Encounters',
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
          disabledPrograms={data?.nodes?.map(program => program.type)}
          open={true}
          onClose={reset}
          onChange={async documentRegistry => {
            const createDocument = {
              data: { enrolmentDatetime: new Date().toISOString() },
              documentRegistry,
            };
            setCreationModal(
              PatientModal.Program,
              documentRegistry.documentType,
              createDocument,
              documentRegistry.documentType
            );
          }}
        />
      ) : null}
      <AppBarButtons />
      <PatientSummary />
      {/* Only show tabs for saved patients */}
      {!!patient ? <PatientDetailView /> : <DetailTabs tabs={tabs} />}
    </React.Suspense>
  );
};
