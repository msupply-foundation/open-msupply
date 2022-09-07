import React, { FC, useCallback, useEffect, useMemo } from 'react';
import {
  DetailTabs,
  DetailViewSkeleton,
  DialogButton,
  LoadingButton,
  useConfirmationModal,
  useNavigate,
  RouteBuilder,
  Box,
  useTranslation,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { usePatient } from '../api';
import {
  usePatientCreateStore,
  usePatientModalStore,
  usePatientStore,
} from '../hooks';
import { AppBarButtons } from './AppBarButtons';
import { PatientSummary } from './PatientSummary';
import { ProgramDetailModal, ProgramListView } from '../ProgramEnrolment';
import { EncounterDetailModal, EncounterListView } from '../Encounter';
import { SaveDocumentMutation, useJsonForms } from '../JsonForms';
import { PatientModal } from '.';

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
  const navigate = useNavigate();
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
  const { JsonForm, saveData, revert, isSaving, isDirty } = useJsonForms(
    documentName,
    { handleSave },
    createDoc
  );
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

  const showCancelConfirmation = useConfirmationModal({
    onConfirm: () => {
      if (createDoc) {
        setNewPatient(undefined);
        navigate(
          RouteBuilder.create(AppRoute.Dispensary)
            .addPart(AppRoute.Patients)
            .build()
        );
      } else {
        revert();
      }
    },
    message: t('messages.confirm-cancel-generic'),
    title: t('heading.are-you-sure'),
  });

  return (
    <>
      <Box style={{ position: 'absolute', bottom: 40, right: 30, zIndex: 100 }}>
        <Box gap={0.5} flexDirection="row" display="flex" alignItems="center">
          <DialogButton
            variant="cancel"
            disabled={!isDirty || isSaving}
            onClick={() => {
              showCancelConfirmation();
            }}
          />
          <LoadingButton
            color="secondary"
            disabled={!isDirty}
            isLoading={isSaving}
            onClick={() => showSaveConfirmation()}
          >
            {createDoc ? t('button.create') : t('button.save')}
          </LoadingButton>
        </Box>
      </Box>
      {JsonForm}
    </>
  );
};

export const PatientView: FC = () => {
  const { current } = usePatientModalStore();
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

  // Note: unmount modals when not used because they have some internal state that shouldn't be
  // reused across calls.
  return (
    <React.Suspense fallback={<DetailViewSkeleton />}>
      {current === PatientModal.Program ? <ProgramDetailModal /> : null}
      {current === PatientModal.Encounter ? <EncounterDetailModal /> : null}
      <AppBarButtons />
      <PatientSummary />
      <DetailTabs tabs={tabs} />
    </React.Suspense>
  );
};
